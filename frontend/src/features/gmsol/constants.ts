// ─── Network selection ───────────────────────────────────────────────

import { SOLANA_DEVNET_RPC, SOLANA_MAINNET_RPC } from "@/config/env";
import { PublicKey } from "@solana/web3.js";
import { GMSOL_STORE_PROGRAM_ID as IDL_PROGRAM_ID } from "@/lib/idl/gmsol/gmsol-store-idl";

/** Toggle via NEXT_PUBLIC_GMSOL_NETWORK=mainnet in .env (default: devnet) */
export const GMSOL_NETWORK: "devnet" | "mainnet" =
  (process.env.NEXT_PUBLIC_GMSOL_NETWORK as "devnet" | "mainnet") || "devnet";

export const GMSOL_RPC_URL =
  GMSOL_NETWORK === "mainnet" ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;

export const GMSOL_CHAIN_PREFIX =
  GMSOL_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet";

// ─── Program IDs ─────────────────────────────────────────────────────

export const GMSOL_STORE_PROGRAM_ID = new PublicKey(IDL_PROGRAM_ID);
