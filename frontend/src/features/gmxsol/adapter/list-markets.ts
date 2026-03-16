import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { GmsolStore } from "@/lib/idl/gmxsol/gmsol_store_type";

export const listMarkets = async (
  program: Program<GmsolStore>,
  connection?: Connection,
) => {
  // Fetch all Market accounts from the program
  try {
    const markets = await program.account.market.all();

    // If connection provided, also fetch raw account data + token supply for SDK decoding
    const conn = connection || program.provider.connection;

    const enriched = await Promise.all(
      markets.map(async (m) => {
        const marketTokenMint = m.account.meta.marketTokenMint.toBase58();

        let rawAccountData: Uint8Array | undefined;
        let marketTokenSupply: string | undefined;

        try {
          // Fetch raw account data for Market.decode()
          const accountInfo = await conn.getAccountInfo(m.publicKey);
          if (accountInfo?.data) {
            rawAccountData = new Uint8Array(accountInfo.data);
          }

          // Fetch market LP token supply for Market.to_model(supply)
          const supplyResp = await conn.getTokenSupply(
            new PublicKey(marketTokenMint),
          );
          marketTokenSupply = supplyResp.value.amount;
        } catch (err) {
          console.warn(
            `[listMarkets] Failed to enrich market ${marketTokenMint}:`,
            err,
          );
        }

        return {
          address: m.publicKey.toBase58(),
          marketTokenMint,
          name: Buffer.from(m.account.name).toString().replace(/\0/g, ""),
          indexToken: m.account.meta.indexTokenMint.toBase58(),
          longToken: m.account.meta.longTokenMint.toBase58(),
          shortToken: m.account.meta.shortTokenMint.toBase58(),
          isEnabled: (m.account.flags.value & 1) !== 0,
          rawAccount: m.account,
          rawAccountData,
          marketTokenSupply,
        };
      }),
    );

    return enriched;
  } catch (error) {
    console.error("Failed to list GMSOL markets:", error);
    throw error;
  }
};
