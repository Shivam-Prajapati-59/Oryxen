import { Program } from "@coral-xyz/anchor";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";

export const listMarkets = async (program: Program<GmsolStore>) => {
  // Fetch all Market accounts from the program
  try {
    const markets = await program.account.market.all();

    return markets.map((m) => ({
      address: m.publicKey.toBase58(),
      name: Buffer.from(m.account.name).toString().replace(/\0/g, ""),
      indexToken: m.account.meta.indexTokenMint.toBase58(),
      longToken: m.account.meta.longTokenMint.toBase58(),
      shortToken: m.account.meta.shortTokenMint.toBase58(),
      isEnabled: (m.account.flags.value & 1) !== 0,
    }));
  } catch (error) {
    console.error("Failed to list GMSOL markets:", error);
    throw error;
  }
};
