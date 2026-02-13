import {
  convertToNumber,
  QUOTE_PRECISION,
  BASE_PRECISION,
  PRICE_PRECISION,
  FUNDING_RATE_PRECISION,
} from "@drift-labs/sdk-browser";
import type { BN } from "@drift-labs/sdk-browser";
import { DRIFT_ENV } from "../constants";

// ─── Explorer URL ────────────────────────────────────────────────────

const EXPLORER_CLUSTER_SUFFIX = DRIFT_ENV === "devnet" ? "?cluster=devnet" : "";

/** Build a Solscan URL for a transaction signature. */
export function explorerUrl(txSig: string): string {
  return `https://solscan.io/tx/${txSig}${EXPLORER_CLUSTER_SUFFIX}`;
}

// ─── Precision helpers (wrappers around SDK convertToNumber) ─────────

/** BN → human-readable USD (QUOTE_PRECISION = 1e6). */
export function bnToUsd(bn: BN): number {
  return convertToNumber(bn, QUOTE_PRECISION);
}

/** BN → human-readable base asset amount (BASE_PRECISION = 1e9). */
export function bnToBase(bn: BN): number {
  return convertToNumber(bn, BASE_PRECISION);
}

/** BN → human-readable price (PRICE_PRECISION = 1e6). */
export function bnToPrice(bn: BN): number {
  return convertToNumber(bn, PRICE_PRECISION);
}

/** BN → human-readable funding rate. */
export function bnToFundingRate(bn: BN): number {
  return convertToNumber(bn, FUNDING_RATE_PRECISION);
}

// ─── Error message normaliser ────────────────────────────────────────

const ERROR_MAP: Array<{ patterns: string[]; message: string }> = [
  {
    patterns: ["0x1773", "6003", "InsufficientCollateral"],
    message:
      "Insufficient collateral. Deposit more funds or reduce position size.",
  },
  {
    patterns: ["0x66", "102", "InstructionDidNotDeserialize"],
    message: "Order parameters invalid. Please check your inputs.",
  },
  {
    patterns: ["InsufficientFunds"],
    message: "Insufficient funds in wallet.",
  },
  {
    patterns: ["OrderDoesNotExist"],
    message: "Order does not exist.",
  },
];

// Turn an SDK error into a user-friendly message.
export function normaliseDriftError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  for (const { patterns, message } of ERROR_MAP) {
    if (patterns.some((p) => raw.includes(p))) return message;
  }
  return raw;
}
