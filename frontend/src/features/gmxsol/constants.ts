// ─── Network selection ───────────────────────────────────────────────

import { SOLANA_DEVNET_RPC, SOLANA_MAINNET_RPC } from "@/config/env";
import { PublicKey } from "@solana/web3.js";
import { GMSOL_STORE_PROGRAM_ID as IDL_PROGRAM_ID } from "@/lib/idl/gmxsol/gmsol-store-idl";

/** Toggle via NEXT_PUBLIC_GMSOL_NETWORK=mainnet in .env (default: devnet) */
const _rawNetwork = process.env.NEXT_PUBLIC_GMSOL_NETWORK;
if (_rawNetwork && _rawNetwork !== "devnet" && _rawNetwork !== "mainnet") {
  console.warn(
    `[GMSOL] Unexpected NEXT_PUBLIC_GMSOL_NETWORK="${_rawNetwork}", falling back to "devnet". Valid values: "devnet" | "mainnet"`,
  );
}
export const GMSOL_NETWORK: "devnet" | "mainnet" =
  _rawNetwork === "mainnet" ? "mainnet" : "devnet";

export const GMSOL_RPC_URL =
  GMSOL_NETWORK === "mainnet" ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;

export const GMSOL_CHAIN_PREFIX =
  GMSOL_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet";

// ─── Program IDs ─────────────────────────────────────────────────────

export const GMSOL_STORE_PROGRAM_ID = new PublicKey(IDL_PROGRAM_ID);
