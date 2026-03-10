// ─── Network selection ───────────────────────────────────────────────

import { SOLANA_NETWORK, SOLANA_RPC_URL } from "@/config/env";
import { PublicKey } from "@solana/web3.js";
import { GMSOL_STORE_PROGRAM_ID as IDL_PROGRAM_ID } from "@/lib/idl/gmxsol/gmsol-store-idl";

/** Network derived from the global chain-switch toggle. */
export const GMSOL_NETWORK: "devnet" | "mainnet" = SOLANA_NETWORK;

export const GMSOL_RPC_URL = SOLANA_RPC_URL;

export const GMSOL_CHAIN_PREFIX =
  GMSOL_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet";

// ─── Program IDs ─────────────────────────────────────────────────────

export const GMSOL_STORE_PROGRAM_ID = new PublicKey(IDL_PROGRAM_ID);
