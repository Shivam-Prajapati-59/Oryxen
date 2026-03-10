import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";

/**
 * Generates instructions to wrap native SOL into WSOL.
 * Creates the ATA if it doesn't exist, transfers SOL, and syncs the native balance.
 */
export const getWrapSolInstructions = (
  owner: PublicKey,
  amountLamports: number,
): TransactionInstruction[] => {
  const instructions: TransactionInstruction[] = [];
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, owner);

  // Use idempotent creation so it safely succeeds even if the account already exists
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      wsolAta,
      owner,
      NATIVE_MINT,
    ),
  );

  instructions.push(
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: wsolAta,
      lamports: amountLamports,
    }),
  );

  instructions.push(createSyncNativeInstruction(wsolAta));

  return instructions;
};

/**
 * Generates the instruction to unwrap WSOL back to native SOL.
 * Closing the WSOL account automatically transfers the underlying SOL back to the owner.
 */
export const getUnwrapSolInstructions = (
  owner: PublicKey,
): TransactionInstruction[] => {
  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, owner);

  return [
    createCloseAccountInstruction(
      wsolAta, // Account to close
      owner, // Destination for the SOL
      owner, // Authority
    ),
  ];
};
