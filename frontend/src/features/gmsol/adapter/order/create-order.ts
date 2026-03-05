import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
} from "@solana/spl-token";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";

// ─── Types ───────────────────────────────────────────────────────────

export type OrderKind =
  | "marketIncrease"
  | "marketDecrease"
  | "limitIncrease"
  | "limitDecrease"
  | "marketSwap"
  | "limitSwap"
  | "stopLossDecrease";

export interface CreateOrderInput {
  owner: PublicKey;
  store: PublicKey;
  marketAddress: PublicKey;
  collateralToken: PublicKey;
  isCollateralTokenLong: boolean;
  initialCollateralAmount: BN;
  isLong: boolean;
  sizeDeltaUsd: BN;
  executionFee: BN;
  orderKind?: OrderKind;
  triggerPrice?: BN;
  acceptablePrice?: BN;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function generateNonce(): number[] {
  const buf = new Uint8Array(32);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    // Fallback for Node
    const { randomBytes } = require("crypto");
    buf.set(randomBytes(32));
  }
  return Array.from(buf);
}

// ─── Create Order ────────────────────────────────────────────────────

export const createOrder = async (
  program: Program<GmsolStore>,
  input: CreateOrderInput,
): Promise<TransactionInstruction[]> => {
  const {
    owner,
    store,
    marketAddress,
    collateralToken,
    isCollateralTokenLong,
    initialCollateralAmount,
    isLong,
    sizeDeltaUsd,
    executionFee,
    orderKind = "marketIncrease",
    triggerPrice,
    acceptablePrice,
  } = input;

  const preInstructions: TransactionInstruction[] = [];

  // 1. Fetch Market Data to validate tokens and get the marketTokenMint
  const market = await program.account.market.fetch(marketAddress);
  const longTokenMint = market.meta.longTokenMint;
  const shortTokenMint = market.meta.shortTokenMint;
  const marketTokenMint = market.meta.marketTokenMint; // <-- We need this for the seeds!

  if (
    !collateralToken.equals(longTokenMint) &&
    !collateralToken.equals(shortTokenMint)
  ) {
    throw new Error("Invalid collateral token for this market.");
  }

  // 2. Generate nonce and Derive PDAs
  const nonce = generateNonce();

  const [userPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), store.toBuffer(), owner.toBuffer()],
    program.programId,
  );

  const [orderPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("order"),
      store.toBuffer(),
      owner.toBuffer(),
      Buffer.from(nonce),
    ],
    program.programId,
  );

  // --- 🛠️ CORRECTED POSITION PDA DERIVATION 🛠️ ---
  // as the Rust PositionKind Enum might map Long to 0 and Short to 1.
  const [positionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      store.toBuffer(),
      owner.toBuffer(),
      marketTokenMint.toBuffer(), // Use the market Token Mint, NOT the market Account Address
      collateralToken.toBuffer(), // Use the actual token mint, NOT a boolean
      Buffer.from([isLong ? 1 : 0]), // The PositionKind (1 = Long, 0 = Short)
    ],
    program.programId,
  );

  // 3. Construct Order Parameters
  const kind: Record<string, Record<string, never>> = { [orderKind]: {} };
  const params = {
    kind,
    decreasePositionSwapType: null,
    executionLamports: executionFee,
    swapPathLength: 0,
    initialCollateralDeltaAmount: initialCollateralAmount,
    sizeDeltaValue: sizeDeltaUsd,
    isLong,
    isCollateralLong: isCollateralTokenLong,
    minOutput: null,
    triggerPrice: triggerPrice ?? null,
    acceptablePrice: acceptablePrice ?? null,
    shouldUnwrapNativeToken: collateralToken.equals(NATIVE_MINT),
    validFromTs: null,
  };

  // 4. Prepare Position Instruction
  const preparePositionIx = await program.methods
    .preparePosition(params as any)
    .accounts({
      owner,
      store,
      market: marketAddress,
      position: positionPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();

  preInstructions.push(preparePositionIx);

  // 5. Prepare User ATAs
  const userLongAta = getAssociatedTokenAddressSync(longTokenMint, owner);
  const userShortAta = getAssociatedTokenAddressSync(shortTokenMint, owner);
  const userCollateralAta = isCollateralTokenLong ? userLongAta : userShortAta;

  preInstructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      userLongAta,
      owner,
      longTokenMint,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      userShortAta,
      owner,
      shortTokenMint,
    ),
  );

  // 6. Handle Native SOL Wrapping
  if (collateralToken.equals(NATIVE_MINT)) {
    preInstructions.push(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: userCollateralAta,
        lamports: initialCollateralAmount.toNumber(),
      }),
      createSyncNativeInstruction(userCollateralAta),
    );
  }

  // 7. Prepare Order Escrow ATAs
  const longTokenEscrow = getAssociatedTokenAddressSync(
    longTokenMint,
    orderPda,
    true, // allowOwnerOffCurve = true for PDA
  );
  const shortTokenEscrow = getAssociatedTokenAddressSync(
    shortTokenMint,
    orderPda,
    true,
  );
  const initialCollateralEscrow = isCollateralTokenLong
    ? longTokenEscrow
    : shortTokenEscrow;
  const finalOutputEscrow = isCollateralTokenLong
    ? longTokenEscrow
    : shortTokenEscrow;

  preInstructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      longTokenEscrow,
      orderPda,
      longTokenMint,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      shortTokenEscrow,
      orderPda,
      shortTokenMint,
    ),
  );

  // 8. Build the Main Instruction
  const orderIx = await program.methods
    .createOrderV2(nonce, params as any, null)
    .accounts({
      owner,
      receiver: owner,
      store,
      market: marketAddress,
      user: userPda,
      order: orderPda,
      position: positionPda,
      initialCollateralToken: collateralToken,
      finalOutputToken: collateralToken,
      longToken: longTokenMint,
      shortToken: shortTokenMint,
      initialCollateralTokenEscrow: initialCollateralEscrow,
      finalOutputTokenEscrow: finalOutputEscrow,
      longTokenEscrow: longTokenEscrow,
      shortTokenEscrow: shortTokenEscrow,
      initialCollateralTokenSource: userCollateralAta,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      callbackAuthority: null,
      callbackProgram: null,
      callbackSharedDataAccount: null,
      callbackPartitionedDataAccount: null,
    } as any)
    .instruction();

  return [...preInstructions, orderIx];
};
