import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { IDL, type Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

const JUPITER_PERPETUALS_PROGRAM_ID = new PublicKey(
  "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu",
);

const PERPETUALS_PUBKEY = new PublicKey(
  "H4ND9aYttUVLFmNypZqLjZ52FYiGvdEB45GmwNoKEjTj",
);
/** Validate base58 Solana address (exclude EVM 0x addresses) */
export const isValidSolanaAddress = (address: string): boolean => {
  if (!address || address.startsWith("0x")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

/** Check if a transaction is a VersionedTransaction */
const isVersionedTransaction = (
  tx: Transaction | VersionedTransaction,
): tx is VersionedTransaction => {
  return (
    "version" in tx ||
    tx.constructor.name === "VersionedTransaction" ||
    typeof (tx as any).message?.version === "number"
  );
};

/**
 * Wraps a Privy wallet into an Anchor-compatible wallet interface so the
 * Flash SDK PerpetualsClient can sign transactions through Privy.
 */
export const createPrivyWalletAdapter = (
  privyWallet: any,
  chainPrefix: string,
) => {
  const publicKey = new PublicKey(privyWallet.address);

  return {
    publicKey,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
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
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> => {
      const signed: T[] = [];
      for (const tx of txs) {
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
          signed.push(VersionedTransaction.deserialize(signedBytes) as T);
        } else {
          signed.push(Transaction.from(signedBytes) as T);
        }
      }
      return signed;
    },
  };
};

export const initializePerpsClient = (privyWallet: any, config: "") => {
  const connection = new Connection(RPC_URL, "processed");

  // 2. Anchor wallet adapter from Privy wallet
  const anchorWallet = createPrivyWalletAdapter(privyWallet, config);

  // 3. Anchor provider
  const provider = new AnchorProvider(connection as any, anchorWallet as any, {
    commitment: "processed",
    skipPreflight: true,
  });
};
