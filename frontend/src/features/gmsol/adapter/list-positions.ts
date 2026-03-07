import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";

export interface PositionInfo {
  address: string;
  owner: string;
  marketToken: string;
  collateralToken: string;
  side: "long" | "short";
  sizeInUsd: string;
  sizeInTokens: string;
  collateralAmount: string;
  borrowingFactor: string;
  createdAt: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawAccount: any;
}

/**
 * Fetch all positions for a given owner from the GMSOL store program.
 *
 * Uses `memcmp` filter on the `owner` field offset in the Position struct:
 *   discriminator (8) + version (1) + bump (1) + store (32) + kind (1) + padding (5) + createdAt (8) = offset 56
 */
export const listPositions = async (
  program: Program<GmsolStore>,
  owner: PublicKey,
): Promise<PositionInfo[]> => {
  try {
    const positions = await program.account.position.all([
      {
        memcmp: {
          offset: 56, // owner field offset
          bytes: owner.toBase58(),
        },
      },
    ]);

    return positions.map((p) => {
      const acct = p.account as any;
      const kind = acct.kind ?? 0;

      return {
        address: p.publicKey.toBase58(),
        owner: acct.owner?.toBase58?.() ?? owner.toBase58(),
        marketToken: acct.marketToken?.toBase58?.() ?? "",
        collateralToken: acct.collateralToken?.toBase58?.() ?? "",
        side: kind === 1 ? "short" : "long",
        sizeInUsd: acct.state?.sizeInUsd?.toString() ?? "0",
        sizeInTokens: acct.state?.sizeInTokens?.toString() ?? "0",
        collateralAmount: acct.state?.collateralAmount?.toString() ?? "0",
        borrowingFactor: acct.state?.borrowingFactor?.toString() ?? "0",
        createdAt: acct.createdAt?.toNumber?.() ?? 0,
        rawAccount: acct,
      };
    });
  } catch (error) {
    console.error("Failed to list GMSOL positions:", error);
    throw error;
  }
};
