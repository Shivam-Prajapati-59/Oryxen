import { Connection, PublicKey } from "@solana/web3.js";
import { type IdlAccounts, Program } from "@coral-xyz/anchor";
import { Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";
import {
  JUPITER_PERPETUALS_PROGRAM,
  RPC_CONNECTION,
} from "@/utils/jupiter-constant";

/**
 * Fetch all open positions for a wallet.
 * Accepts optional connection & program to avoid relying on globals.
 */
export async function getOpenPositionsForWallet(
  walletAddress: string,
  connection?: Connection,
  program?: Program<Perpetuals>,
) {
  const prog = program ?? JUPITER_PERPETUALS_PROGRAM;
  const conn = connection ?? RPC_CONNECTION;

  try {
    // 1. Get the exact size of the Position account for efficient filtering
    const positionSize = prog.account.position.size;

    const gpaResult = await conn.getProgramAccounts(prog.programId, {
      commitment: "confirmed",
      filters: [
        // Filter 1: Exact size check (Performance optimization)
        { dataSize: positionSize },
        // Filter 2: Account Discriminator (Ensure it's a "Position" account)
        {
          memcmp: prog.coder.accounts.memcmp("position"),
        },
        // Filter 3: Owner Wallet Address (Offset 8 skips the 8-byte discriminator)
        {
          memcmp: {
            bytes: new PublicKey(walletAddress).toBase58(),
            offset: 8,
          },
        },
      ],
    });

    const positions = gpaResult.map((item) => {
      return {
        publicKey: item.pubkey,
        account: prog.coder.accounts.decode(
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
