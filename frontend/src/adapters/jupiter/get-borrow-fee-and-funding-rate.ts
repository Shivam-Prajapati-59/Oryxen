import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  BPS_POWER,
  DBPS_POWER,
  DEBT_POWER,
  JUPITER_PERPETUALS_PROGRAM,
  RATE_POWER,
  USDC_DECIMALS,
} from "@/utils/jupiter-constant";
import { BNToUSDRepresentation, divCeil } from "@/utils/jupiter";
import { Custody } from "@/types/jupiter";

const HOURS_IN_A_YEAR = 24 * 365;

enum BorrowRateMechanism {
  Linear,
  Jump,
}

export const getBorrowFee = async (
  positionPubkey: PublicKey | string,
  curtime: BN,
) => {
  const position = await JUPITER_PERPETUALS_PROGRAM.account.position.fetch(
    positionPubkey,
  );

  const custody = await JUPITER_PERPETUALS_PROGRAM.account.custody.fetch(
    position.custody,
  );

  if (position.sizeUsd.eqn(0)) return new BN(0);

  const cumulativeInterest = getCumulativeInterest(custody, curtime);
  const positionInterest = cumulativeInterest.sub(
    position.cumulativeInterestSnapshot,
  );

  const borrowFee = divCeil(positionInterest.mul(position.sizeUsd), RATE_POWER);

  console.log(
    "Outstanding borrow fee ($): ",
    BNToUSDRepresentation(borrowFee, USDC_DECIMALS),
  );
};

export function getBorrowRateMechanism(custody: Custody) {
  if (!custody.fundingRateState.hourlyFundingDbps.eq(new BN(0))) {
    return BorrowRateMechanism.Linear;
  } else {
    return BorrowRateMechanism.Jump;
  }
}

export const getCumulativeInterest = (custody: Custody, curtime: BN) => {
  if (curtime.gt(custody.fundingRateState.lastUpdate)) {
    const fundingRate = getCurrentFundingRate(custody, curtime);
    return custody.fundingRateState.cumulativeInterestRate.add(fundingRate);
  } else {
    return custody.fundingRateState.cumulativeInterestRate;
  }
};

export function getDebt(custody: Custody) {
  return divCeil(
    BN.max(custody.debt.sub(custody.borrowLendInterestsAccured), new BN(0)),
    DEBT_POWER,
  );
}

export function theoreticallyOwned(custody: Custody) {
  return custody.assets.owned.add(getDebt(custody));
}

export function totalLocked(custody: Custody) {
  return custody.assets.locked.add(getDebt(custody));
}

export const getHourlyBorrowRate = (
  custody: Custody,
  isBorrowCurve = false,
) => {
  const borrowRateMechanism = getBorrowRateMechanism(custody);
  const owned = theoreticallyOwned(custody);
  const locked = totalLocked(custody);

  if (borrowRateMechanism === BorrowRateMechanism.Linear) {
    const fundingRateState = isBorrowCurve
      ? custody.borrowsFundingRateState
      : custody.fundingRateState;
    const hourlyFundingRate = fundingRateState.hourlyFundingDbps
      .mul(RATE_POWER)
      .div(DBPS_POWER);

    return owned.gtn(0) && locked.gtn(0)
      ? divCeil(locked.mul(hourlyFundingRate), owned)
      : new BN(0);
  } else {
    const { minRateBps, maxRateBps, targetRateBps, targetUtilizationRate } =
      custody.jumpRateState;

    const utilizationRate =
      owned.gtn(0) && locked.gtn(0)
        ? locked.mul(RATE_POWER).div(owned)
        : new BN(0);

    let yearlyRate: BN;

    if (utilizationRate.lte(targetUtilizationRate)) {
      yearlyRate = divCeil(
        targetRateBps.sub(minRateBps).mul(utilizationRate),
        targetUtilizationRate,
      )
        .add(minRateBps)
        .mul(RATE_POWER)
        .div(BPS_POWER);
    } else {
      const rateDiff = BN.max(new BN(0), maxRateBps.sub(targetRateBps));
      const utilDiff = BN.max(
        new BN(0),
        utilizationRate.sub(targetUtilizationRate),
      );
      const denom = BN.max(new BN(0), RATE_POWER.sub(targetUtilizationRate));

      if (denom.eqn(0)) {
        throw new Error("Denominator is 0");
      }

      yearlyRate = divCeil(rateDiff.mul(utilDiff), denom)
        .add(targetRateBps)
        .mul(RATE_POWER)
        .div(BPS_POWER);
    }

    return yearlyRate.divn(HOURS_IN_A_YEAR);
  }
};

// Returns the borrow APR for the year for a given custody
export const getBorrowApr = (custody: Custody) => {
  return (
    (getHourlyBorrowRate(custody, true).toNumber() / RATE_POWER.toNumber()) *
    (24 * 365) *
    100
  );
};

export const getCurrentFundingRate = (custody: Custody, curtime: BN) => {
  if (custody.assets.owned.eqn(0)) return new BN(0);

  const interval = curtime.sub(custody.fundingRateState.lastUpdate);
  const currentFundingRate = getHourlyBorrowRate(custody);

  return divCeil(currentFundingRate.mul(interval), new BN(3600));
};
