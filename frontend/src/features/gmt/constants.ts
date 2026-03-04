/**
 * GMTrade on Solana — constants, program IDs, and connection config.
 *
 * Follows the same pattern as `features/jupiter/constants.ts` and
 * `features/flash/` — centralised program references used by the hook.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { IDL, GMSOL_STORE_PROGRAM_ADDRESS } from "@/lib/idl/gmsol-store-idl";
import type { GmsolStore } from "@/lib/idl/gmsol-store-idl";
import { SOLANA_DEVNET_RPC, SOLANA_MAINNET_RPC } from "@/config/env";

// ─── Network selection ───────────────────────────────────────────────

/** Toggle via NEXT_PUBLIC_GMT_NETWORK=mainnet in .env (default: devnet) */
export const GMT_NETWORK: "devnet" | "mainnet" =
  (process.env.NEXT_PUBLIC_GMT_NETWORK as "devnet" | "mainnet") || "devnet";

export const GMT_RPC_URL =
  GMT_NETWORK === "mainnet" ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;

export const GMT_CHAIN_PREFIX =
  GMT_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet";

// ─── Program IDs ─────────────────────────────────────────────────────

export const GMSOL_STORE_PROGRAM_ID = new PublicKey(
  GMSOL_STORE_PROGRAM_ADDRESS,
);

// ─── Connection ──────────────────────────────────────────────────────

export const GMT_CONNECTION = new Connection(GMT_RPC_URL, "confirmed");

// ─── Read-only dummy wallet for public data fetches ──────────────────

class DummyWallet {
  constructor(readonly payer: Keypair) {}

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer);
    } else {
      (tx as VersionedTransaction).sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> {
    for (const tx of txs) {
      if (tx instanceof Transaction) {
        tx.partialSign(this.payer);
      } else {
        (tx as VersionedTransaction).sign([this.payer]);
      }
    }
    return txs;
  }
}

// ─── Read-only program instance (for listing markets, positions) ─────

export const GMT_READ_ONLY_PROVIDER = new AnchorProvider(
  GMT_CONNECTION,
  new DummyWallet(Keypair.generate()),
  AnchorProvider.defaultOptions(),
);

export const GMT_PROGRAM = new Program(
  IDL as GmsolStore,
  GMT_READ_ONLY_PROVIDER,
);

// ─── Native SOL mint ─────────────────────────────────────────────────

export const NATIVE_SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);

// ─── Price precision constants (matching Rust main.rs) ───────────────

/** All USD size values use 10^20 scale */
export const MARKET_USD_UNIT = BigInt(10) ** BigInt(20);

/** SOL (9 decimals) → price * 10^21 */
export const SOL_PRICE_UNIT = BigInt(10) ** BigInt(21);

/**
 * Derive the price unit for a given token based on its decimals.
 * SDK price unit = 10^(30 - token_decimals)
 */
export function getTokenPriceUnit(decimals: number): bigint {
  return BigInt(10) ** BigInt(30 - decimals);
}

/** Known token decimals for price calculation (matching Rust code) */
export const TOKEN_DECIMALS: Record<string, number> = {
  BTC: 8,
  ETH: 8,
  WETH: 8,
  SOL: 9,
  WSOL: 9,
  USDC: 6,
  USDT: 6,
  DAI: 6,
  BONK: 5,
  WIF: 5,
  BOME: 5,
};
