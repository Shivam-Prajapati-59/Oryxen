// Drift — Position & account queries.

import {
  type DriftClient,
  type User,
  convertToNumber,
  QUOTE_PRECISION,
  BASE_PRECISION,
  PRICE_PRECISION,
  MARGIN_PRECISION,
  PerpMarkets,
  SpotMarkets,
} from "@drift-labs/sdk-browser";
import { BN } from "@coral-xyz/anchor";
import { DRIFT_ENV } from "../constants";
import { bnToUsd, bnToBase, bnToPrice } from "./utils";
import type { PerpPositionInfo, SpotBalance, AccountSummary } from "../types";

/**
 * Get the full account summary using SDK precision constants.
 * No hardcoded margin rates or fee values.
 */
export function getAccountSummary(
  client: DriftClient,
  user: User,
): AccountSummary {
  const totalCollateral = bnToUsd(user.getTotalCollateral());
  const freeCollateral = bnToUsd(user.getFreeCollateral());
  const initialMarginRequirement = bnToUsd(user.getInitialMarginRequirement());
  const maintenanceMarginRequirement = bnToUsd(
    user.getMaintenanceMarginRequirement(),
  );
  const leverage = convertToNumber(user.getLeverage(), MARGIN_PRECISION);
  const unrealizedPnl = bnToUsd(user.getUnrealizedPNL(true));

  // Margin ratio = collateral / initial margin (or Infinity if no requirement)
  const marginRatio =
    initialMarginRequirement > 0
      ? totalCollateral / initialMarginRequirement
      : Infinity;

  // Perp positions
  const perpPositions = getActivePositions(client, user);

  // Spot balances
  const spotBalances = getSpotBalances(client, user);

  // Open orders
  const openOrders = user.getOpenOrders().map((order) => {
    const perpMarket = PerpMarkets[DRIFT_ENV].find(
      (m) => m.marketIndex === order.marketIndex,
    );
    return {
      orderId: order.orderId,
      userOrderId: order.userOrderId,
      marketIndex: order.marketIndex,
      marketName: perpMarket?.symbol ?? `PERP-${order.marketIndex}`,
      orderType: order.orderType,
      direction: order.direction,
      size: bnToBase(order.baseAssetAmount),
      filledSize: bnToBase(order.baseAssetAmountFilled),
      price: bnToPrice(order.price),
      triggerPrice: order.triggerPrice.isZero()
        ? undefined
        : bnToPrice(order.triggerPrice),
      triggerCondition: order.triggerCondition,
      slot: order.slot,
      reduceOnly: order.reduceOnly,
      postOnly: !!order.postOnly,
    };
  });

  return {
    totalCollateral,
    freeCollateral,
    initialMarginRequirement,
    maintenanceMarginRequirement,
    marginRatio,
    leverage,
    unrealizedPnl,
    perpPositions,
    spotBalances,
    openOrders,
  };
}

/**
 * Active perp positions with SDK-computed values.
 */
export function getActivePositions(
  client: DriftClient,
  user: User,
): PerpPositionInfo[] {
  const positions = user.getActivePerpPositions();

  return positions.map((pos) => {
    const perpMarket = PerpMarkets[DRIFT_ENV].find(
      (m) => m.marketIndex === pos.marketIndex,
    );
    const oracleData = client.getOracleDataForPerpMarket(pos.marketIndex);
    const markPrice = bnToPrice(oracleData.price);

    const baseAmount = bnToBase(pos.baseAssetAmount);
    const isLong =
      pos.baseAssetAmount.isNeg() === false && !pos.baseAssetAmount.isZero();
    const isShort = pos.baseAssetAmount.isNeg();

    const quoteEntry = bnToUsd(pos.quoteEntryAmount);
    const quoteBreakEven = bnToUsd(pos.quoteBreakEvenAmount);
    const size = Math.abs(baseAmount);

    const entryPrice = size > 0 ? Math.abs(quoteEntry) / size : 0;
    const breakEvenPrice = size > 0 ? Math.abs(quoteBreakEven) / size : 0;

    const notionalValue = size * markPrice;
    const unrealizedPnl = bnToUsd(
      user.getUnrealizedPNL(false, pos.marketIndex),
    );

    // Use SDK liquidation price — no hardcoded margin rates
    let liquidationPrice: number | undefined;
    try {
      const liqPriceBn = user.liquidationPrice(pos.marketIndex);
      if (liqPriceBn && !liqPriceBn.isZero()) {
        liquidationPrice = bnToPrice(liqPriceBn);
      }
    } catch {
      // position may not have a meaningful liq price
    }

    return {
      marketIndex: pos.marketIndex,
      marketName: perpMarket?.symbol ?? `PERP-${pos.marketIndex}`,
      baseAssetAmount: pos.baseAssetAmount,
      quoteAssetAmount: pos.quoteAssetAmount,
      quoteEntryAmount: pos.quoteEntryAmount,
      quoteBreakEvenAmount: pos.quoteBreakEvenAmount,
      openOrders: pos.openOrders,
      openBids: pos.openBids,
      openAsks: pos.openAsks,
      settledPnl: pos.settledPnl,
      lpShares: pos.lpShares,
      direction: isLong ? "long" : isShort ? "short" : "none",
      size,
      notionalValue,
      unrealizedPnl,
      entryPrice,
      breakEvenPrice,
      markPrice,
      liquidationPrice,
    };
  });
}

/**
 * Active spot balances with proper per-token decimal handling.
 *
 * Uses `client.getSpotMarketAccount()` for decimals and
 * `client.getOracleDataForSpotMarket()` for USD conversion —
 * no assumption that every token is QUOTE_PRECISION.
 */
export function getSpotBalances(
  client: DriftClient,
  user: User,
): SpotBalance[] {
  const positions = user.getActiveSpotPositions();
  return positions.map((pos) => {
    const spotMarketMeta = SpotMarkets[DRIFT_ENV].find(
      (m) => m.marketIndex === pos.marketIndex,
    );
    const tokenAmount = user.getTokenAmount(pos.marketIndex);
    const isDeposit = tokenAmount.gte(new BN(0));
    const absAmount = tokenAmount.abs();

    // Get decimals from on-chain market account, fallback to metadata
    const spotMarketAccount = client.getSpotMarketAccount(pos.marketIndex);
    const decimals =
      spotMarketAccount?.decimals ??
      spotMarketMeta?.precisionExp?.toNumber() ??
      6;

    // Raw token balance (e.g. 1.5 SOL, 100 USDC)
    const precision = new BN(10).pow(new BN(decimals));
    const balance = convertToNumber(absAmount, precision);

    // USD value via spot oracle
    let balanceUsd = balance; // default: assume 1:1 for USDC (index 0)
    if (pos.marketIndex !== 0) {
      try {
        const oracleData = client.getOracleDataForSpotMarket(pos.marketIndex);
        const oraclePrice = bnToPrice(oracleData.price);
        balanceUsd = balance * oraclePrice;
      } catch {
        // oracle unavailable — fall back to raw balance
      }
    }

    return {
      marketIndex: pos.marketIndex,
      symbol: spotMarketMeta?.symbol ?? `SPOT-${pos.marketIndex}`,
      balance,
      balanceUsd,
      decimals,
      balanceType: isDeposit ? "deposit" : "borrow",
    };
  });
}

/**
 * Check whether a trade is affordable based on SDK margin calculations.
 */
export function canAffordTrade(
  client: DriftClient,
  user: User,
  baseAssetAmount: number,
  marketIndex: number,
): {
  canAfford: boolean;
  reason?: string;
  freeCollateral: number;
  requiredMargin?: number;
} {
  if (baseAssetAmount <= 0) {
    return {
      canAfford: false,
      reason: "Invalid base asset amount",
      freeCollateral: bnToUsd(user.getFreeCollateral()),
    };
  }
  const freeCollateral = bnToUsd(user.getFreeCollateral());
  const oracleData = client.getOracleDataForPerpMarket(marketIndex);
  const oraclePrice = bnToPrice(oracleData.price);
  const notionalValue = baseAssetAmount * oraclePrice;

  // Read initial margin ratio from the market account (not hardcoded)
  const market = client.getPerpMarketAccount(marketIndex);
  if (!market) {
    return { canAfford: false, reason: "Market not found", freeCollateral };
  }

  // marginRatioInitial is in MARGIN_PRECISION (10_000 = 100%)
  const initialMarginRatio = market.marginRatioInitial / 10_000;
  const requiredMargin = notionalValue * initialMarginRatio;

  if (freeCollateral < requiredMargin) {
    return {
      canAfford: false,
      reason: `Insufficient collateral. $${freeCollateral.toFixed(
        2,
      )} free, need ~$${requiredMargin.toFixed(2)} margin.`,
      freeCollateral,
      requiredMargin,
    };
  }

  return { canAfford: true, freeCollateral, requiredMargin };
}
