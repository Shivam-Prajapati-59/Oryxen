/**
 * Drift Protocol — environment constants.
 *
 * Network selection is driven by the shared SOLANA_NETWORK value
 * (persisted in localStorage via the chain-switch button).
 */

import { SOLANA_NETWORK, SOLANA_RPC_URL } from "@/config/env";

/** Drift environment derived from the global network toggle. */
export const DRIFT_ENV: "devnet" | "mainnet-beta" =
  SOLANA_NETWORK === "mainnet" ? "mainnet-beta" : "devnet";

/** Resolved RPC URL based on environment. */
export const DRIFT_RPC_URL = SOLANA_RPC_URL;

/** Privy chain prefix for transaction signing. */
export const DRIFT_CHAIN_PREFIX =
  DRIFT_ENV === "devnet" ? "solana:devnet" : "solana:mainnet";
