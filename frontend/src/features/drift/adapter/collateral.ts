// Drift — Deposit & withdraw helpers.

import { DriftClient, BN, SpotMarkets } from "@drift-labs/sdk-browser";
import { DRIFT_ENV } from "../constants";
import { getDriftConnection } from "./client";
import { explorerUrl } from "./utils";
import type { TradeResult } from "../types";

export function resolveSpotIndex(symbol: string): number {
  const market = SpotMarkets[DRIFT_ENV].find((m) => m.symbol === symbol);
  if (!market)
    throw new Error(`Spot market "${symbol}" not found in ${DRIFT_ENV}`);
  return market.marketIndex;
}

/**
 * Deposit a token into a Drift sub-account.
 *
 * @param client       Subscribed DriftClient
 * @param amount       Human-readable amount (e.g. 100 for 100 USDC)
 * @param symbol       Token symbol ("USDC", "SOL", etc.)
 * @param subAccountId Sub-account (default 0)
 */
export async function deposit(
  client: DriftClient,
  amount: number,
  symbol: string,
  subAccountId: number = 0,
): Promise<TradeResult> {
  const marketIndex = resolveSpotIndex(symbol);
  const depositAmount = client.convertToSpotPrecision(marketIndex, amount);

  const associatedTokenAccount = await client.getAssociatedTokenAccount(
    marketIndex,
  );

  // Balance check
  const connection = getDriftConnection();
  const walletPubkey = client.wallet.publicKey;

  let tokenBalance: BN;
  if (symbol === "SOL") {
    const lamports = await connection.getBalance(walletPubkey);
    tokenBalance = new BN(lamports);
  } else {
    try {
      const info = await connection.getTokenAccountBalance(
        associatedTokenAccount,
      );
      tokenBalance = new BN(info.value.amount);
    } catch {
      tokenBalance = new BN(0);
    }
  }

  if (depositAmount.gt(tokenBalance)) {
    const spotInfo = SpotMarkets[DRIFT_ENV].find(
      (m) => m.marketIndex === marketIndex,
    )!;
    const readable =
      tokenBalance.toNumber() / Math.pow(10, spotInfo.precisionExp.toNumber());
    throw new Error(
      `Insufficient balance. You have ${readable} ${symbol} but need ${amount}`,
    );
  }

  const txSig = await client.deposit(
    depositAmount,
    marketIndex,
    associatedTokenAccount,
    subAccountId,
  );

  return { txSig, explorerUrl: explorerUrl(txSig) };
}

/**
 * Withdraw a token from a Drift sub-account.
 *
 * @param client       Subscribed DriftClient
 * @param amount       Human-readable amount
 * @param symbol       Token symbol
 * @param reduceOnly   If true, prevents creating a borrow
 * @param subAccountId Sub-account (default 0)
 */
export async function withdraw(
  client: DriftClient,
  amount: number,
  symbol: string,
  reduceOnly: boolean = false,
  subAccountId: number = 0,
): Promise<TradeResult> {
  const marketIndex = resolveSpotIndex(symbol);
  const withdrawAmount = client.convertToSpotPrecision(marketIndex, amount);

  const associatedTokenAccount = await client.getAssociatedTokenAccount(
    marketIndex,
  );

  const txSig = await client.withdraw(
    withdrawAmount,
    marketIndex,
    associatedTokenAccount,
    reduceOnly,
    subAccountId,
  );

  return { txSig, explorerUrl: explorerUrl(txSig) };
}
