import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  JLP_POOL_ACCOUNT_PUBKEY,
  JUPITER_PERPETUALS_PROGRAM_ID,
} from "@/utils/jupiter-constant";

// The `positionRequest` PDA holds the requests for all the perpetuals actions.
// https://station.jup.ag/guides/perpetual-exchange/onchain-accounts#positionrequest-account
export function generatePositionRequestPda({
  counter,
  positionPubkey,
  requestChange,
}: {
  counter?: BN;
  positionPubkey: PublicKey;
  requestChange: "increase" | "decrease";
}) {
  // The `counter` constant acts a random seed so we can generate a unique PDA every time the user
  // creates a position request
  if (!counter) {
    counter = new BN(Math.floor(Math.random() * 1_000_000_000));
  }

  const requestChangeEnum = requestChange === "increase" ? [1] : [2];
  const [positionRequest, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("position_request"),
      new PublicKey(positionPubkey).toBuffer(),
      counter.toArrayLike(Buffer, "le", 8),
      Buffer.from(requestChangeEnum),
    ],
    JUPITER_PERPETUALS_PROGRAM_ID,
  );

  return { positionRequest, counter, bump };
}

// The `Position` PDA stores the position data for a trader's positions (both open and closed).
// https://station.jup.ag/guides/perpetual-exchange/onchain-accounts#position-account
export function generatePositionPda({
  custody,
  collateralCustody,
  walletAddress,
  side,
}: {
  custody: PublicKey;
  collateralCustody: PublicKey;
  walletAddress: PublicKey;
  side: "long" | "short";
}) {
  const [position, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      walletAddress.toBuffer(),
      JLP_POOL_ACCOUNT_PUBKEY.toBuffer(),
      custody.toBuffer(),
      collateralCustody.toBuffer(),
      // @ts-ignore
      side === "long" ? [1] : [2], // This is due to how the `Side` enum is structured in the contract
    ],
    JUPITER_PERPETUALS_PROGRAM_ID,
  );

  return { position, bump };
}
