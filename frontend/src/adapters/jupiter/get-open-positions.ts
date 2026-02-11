import { PublicKey } from "@solana/web3.js";
import { type IdlAccounts } from "@coral-xyz/anchor";
import { Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";
import {
  JUPITER_PERPETUALS_PROGRAM,
  RPC_CONNECTION,
} from "@/utils/jupiter-constant";

export async function getOpenPositionsForWallet(walletAddress: string) {
  try {
    // 1. Get the exact size of the Position account for efficient filtering
    const positionSize = JUPITER_PERPETUALS_PROGRAM.account.position.size;

    const gpaResult = await RPC_CONNECTION.getProgramAccounts(
      JUPITER_PERPETUALS_PROGRAM.programId,
      {
        commitment: "confirmed",
        filters: [
          // Filter 1: Exact size check (Performance optimization)
          { dataSize: positionSize },
          // Filter 2: Account Discriminator (Ensure it's a "Position" account)
          {
            memcmp:
              JUPITER_PERPETUALS_PROGRAM.coder.accounts.memcmp("position"),
          },
          // Filter 3: Owner Wallet Address (Offset 8 skips the 8-byte discriminator)
          {
            memcmp: {
              bytes: new PublicKey(walletAddress).toBase58(),
              offset: 8,
            },
          },
        ],
      },
    );

    const positions = gpaResult.map((item) => {
      return {
        publicKey: item.pubkey,
        account: JUPITER_PERPETUALS_PROGRAM.coder.accounts.decode(
          "position",
          item.account.data,
        ) as IdlAccounts<Perpetuals>["position"],
      };
    });

    // Filter out any 0-size positions (just in case)
    const openPositions = positions.filter((position) =>
      position.account.sizeUsd.gtn(0),
    );

    console.log(`Found ${openPositions.length} open positions.`);

    // Return the data to the caller
    return openPositions;
  } catch (error) {
    console.error(
      `Failed to fetch open positions for wallet address ${walletAddress}`,
      error,
    );
    return []; // Return empty array on failure
  }
}
