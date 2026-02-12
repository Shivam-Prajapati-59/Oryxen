/**
 * Drift Protocol — environment constants.
 */

import { SOLANA_DEVNET_RPC, SOLANA_MAINNET_RPC } from "@/config/env";

/** Drift environment — change to "mainnet-beta" for production. */
export const DRIFT_ENV = "devnet" as const;

/** Resolved RPC URL based on environment. */
export const DRIFT_RPC_URL =
  DRIFT_ENV === "devnet" ? SOLANA_DEVNET_RPC : SOLANA_MAINNET_RPC;

/** Privy chain prefix for transaction signing. */
export const DRIFT_CHAIN_PREFIX =
  DRIFT_ENV === "devnet" ? "solana:devnet" : "solana:mainnet";
