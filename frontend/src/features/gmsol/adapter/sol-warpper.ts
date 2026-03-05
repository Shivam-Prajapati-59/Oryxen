import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";

/**
 * Generates instructions to Wrap native SOL into wSOL.
 */
export const getWrapSolInstructions = async (
  connection: Connection,
  owner: PublicKey,
  amountLamports: number,
): Promise<TransactionInstruction[]> => {
  const instructions: TransactionInstruction[] = [];

  // 1. Get the expected wSOL Associated Token Account (ATA) address
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, owner);

  // 2. Check if the user already has a wSOL account initialized
  const ataInfo = await connection.getAccountInfo(wsolAta);
  if (!ataInfo) {
    // If not, add the instruction to create it
    instructions.push(
      createAssociatedTokenAccountInstruction(
        owner, // Payer
        wsolAta, // ATA to create
        owner, // Owner of the ATA
        NATIVE_MINT, // Mint (wSOL)
      ),
    );
  }

  // 3. Transfer native SOL from the user's main wallet to the wSOL ATA
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: wsolAta,
      lamports: amountLamports,
    }),
  );

  // 4. Sync Native: This tells the Token Program to update the wSOL balance
  // to match the native SOL that was just transferred into the account.
  instructions.push(createSyncNativeInstruction(wsolAta));

  return instructions;
};

/**
 * Generates the instruction to Unwrap wSOL back to native SOL.
 */
export const getUnwrapSolInstructions = (
  owner: PublicKey,
): TransactionInstruction[] => {
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, owner);

  // Closing the wSOL account automatically sends all the underlying SOL
  // (including the rent exemption SOL) back to the destination wallet.
  return [
    createCloseAccountInstruction(
      wsolAta, // Account to close
      owner, // Destination for the SOL
      owner, // Authority of the account being closed
    ),
  ];
};
