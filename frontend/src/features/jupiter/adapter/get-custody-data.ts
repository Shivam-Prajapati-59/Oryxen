import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";
import {
  CUSTODY_PUBKEY,
  JUPITER_PERPETUALS_PROGRAM,
} from "@/features/jupiter/constants";

const CUSTODY_SYMBOLS: Record<string, string> = {
  [CUSTODY_PUBKEY.SOL]: "SOL",
  [CUSTODY_PUBKEY.BTC]: "BTC",
  [CUSTODY_PUBKEY.ETH]: "ETH",
  [CUSTODY_PUBKEY.USDC]: "USDC",
  [CUSTODY_PUBKEY.USDT]: "USDT",
};

/**
   Fetches all 5 JLP custody accounts (SOL, BTC, ETH, USDC, USDT).
 * Accepts an optional program instance so callers can pass the user's
 * provider-backed program instead of relying on the global read-only one.
 */
export async function getCustodyData(program?: Program<Perpetuals>) {
  const prog = program ?? JUPITER_PERPETUALS_PROGRAM;
  const custodyEntries = Object.entries(CUSTODY_SYMBOLS);

  const results = await Promise.all(
    custodyEntries.map(async ([pubkeyStr, symbol]) => {
      const publicKey = new PublicKey(pubkeyStr);
      const account = await prog.account.custody.fetch(publicKey);
      return { publicKey, account, symbol };
    }),
  );

  return results;
}
