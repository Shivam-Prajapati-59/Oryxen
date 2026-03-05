import { Program } from "@coral-xyz/anchor";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";
import { PublicKey } from "@solana/web3.js";

type PositionSide = "long" | "short";

export const listPositions = async (
  program: Program<GmsolStore>,
  owner: PublicKey,
) => {
  const ownner = new PublicKey(owner);
  // Fetch Position accounts filtered by owner

  try {
    const positions = await program.account.position.all([
      {
        memcmp: {
          offset: 8,
          bytes: ownner.toBase58(),
        },
      },
    ]);

    return positions.map((acc: any) => {
      const data = acc.account as any;
      const side: PositionSide = data.kind === 1 ? "long" : "short";

      return {
        address: acc.publicKey.toBase58(),
        store: data.store?.toBase58() ?? "",
        owner: data.owner?.toBase58() ?? "",
        marketToken: data.marketToken?.toBase58() ?? "",
        side,
        kind: data.kind ?? 0,
        sizeInUsd: data.state?.sizeInUsd?.toString() ?? "0",
        sizeInTokens: data.state?.sizeInTokens?.toString() ?? "0",
        collateralAmount: data.state?.collateralAmount?.toString() ?? "0",
      };
    });
  } catch (error) {
    console.error("Failed to list GMSOL positions:", error);
    throw error;
  }
};
