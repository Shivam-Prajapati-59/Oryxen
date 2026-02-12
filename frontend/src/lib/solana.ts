/**
 * Shared Solana wallet utilities used across all protocol adapters.
 *
 * Centralises `isValidSolanaAddress`, `isVersionedTransaction`,
 * `createPrivyWalletAdapter`, and `parseTokenAmount` so they are
 * defined once and imported by every feature module.
 */

import { BN } from "@coral-xyz/anchor";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

// ─── Address validation ──────────────────────────────────────────────

/** Validate base58 Solana address (excludes EVM 0x addresses). */
export const isValidSolanaAddress = (address: string): boolean => {
  if (!address || address.startsWith("0x")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

// ─── Transaction type guard ──────────────────────────────────────────

/**
 * Check if a transaction is a VersionedTransaction.
 * Uses multiple checks because `instanceof` can fail across module versions.
 */
export const isVersionedTransaction = (
  tx: Transaction | VersionedTransaction,
): tx is VersionedTransaction => {
  return (
    "version" in tx ||
    tx.constructor.name === "VersionedTransaction" ||
    typeof (tx as any).message?.version === "number"
  );
};

// ─── Privy wallet adapter ────────────────────────────────────────────

/**
 * Wraps a Privy wallet into an Anchor-compatible wallet interface.
 *
 * Works with Flash, Jupiter, Drift, and any other protocol that needs
 * `{ publicKey, signTransaction, signAllTransactions }`.
 */
export const createPrivyWalletAdapter = (
  privyWallet: any,
  chainPrefix: string,
) => {
  const publicKey = new PublicKey(privyWallet.address);

  const signSingle = async <T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T> => {
    let serialized: Uint8Array;

    if (isVersionedTransaction(tx)) {
      serialized = tx.serialize();
    } else {
      serialized = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
    }

    const result = await privyWallet.signTransaction({
      chain: chainPrefix,
      transaction: serialized,
    });

    const signedBytes = new Uint8Array(result.signedTransaction);

    if (isVersionedTransaction(tx)) {
      return VersionedTransaction.deserialize(signedBytes) as T;
    } else {
      return Transaction.from(signedBytes) as T;
    }
  };

  return {
    publicKey,
    signTransaction: signSingle,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> => {
      const signed: T[] = [];
      for (const tx of txs) {
        signed.push(await signSingle(tx));
      }
      return signed;
    },
  };
};

// ─── BN parsing ──────────────────────────────────────────────────────

/**
 * Convert a decimal number string to a BN with the given on-chain decimals.
 * Uses string manipulation to avoid floating-point precision loss.
 */
export function parseTokenAmount(amountStr: string, decimals: number): BN {
  amountStr = amountStr.trim();
  if (amountStr === "" || isNaN(Number(amountStr))) {
    throw new Error(`Invalid amount: "${amountStr}"`);
  }

  const negative = amountStr.startsWith("-");
  if (negative) amountStr = amountStr.slice(1);

  const [intPart, fracPart = ""] = amountStr.split(".");
  const paddedFrac = fracPart.padEnd(decimals, "0").slice(0, decimals);
  const raw = intPart + paddedFrac;
  const cleaned = raw.replace(/^0+/, "") || "0";
  return negative ? new BN(cleaned).neg() : new BN(cleaned);
}
