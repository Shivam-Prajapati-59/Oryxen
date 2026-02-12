import { BN, Program } from "@coral-xyz/anchor";
import {
  Blockhash,
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { CustodyAccount, Position } from "@/features/jupiter/types";
import { Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";
import { generatePositionRequestPda } from "./generate-position-and-position-request-pda";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import {
  JLP_POOL_ACCOUNT_PUBKEY,
  JUPITER_PERPETUALS_PROGRAM_ID,
} from "@/features/jupiter/constants";

export async function constructMarketOpenPositionTrade({
  custody,
  collateralCustody,
  collateralTokenDelta,
  connection,
  inputMint,
  jupiterMinimumOut,
  owner,
  priceSlippage,
  program,
  recentBlockhash,
  side,
  sizeUsdDelta,
  positionPubkey,
}: {
  custody: CustodyAccount;
  collateralCustody: CustodyAccount;
  collateralTokenDelta: BN;
  connection: import("@solana/web3.js").Connection;
  inputMint: PublicKey;
  jupiterMinimumOut: BN | null;
  owner: PublicKey;
  priceSlippage: BN;
  program: Program<Perpetuals>;
  recentBlockhash: Blockhash;
  side: Position["side"];
  sizeUsdDelta: BN;
  positionPubkey: PublicKey;
}) {
  // Generate request PDA
  const { positionRequest, counter } = generatePositionRequestPda({
    positionPubkey,
    requestChange: "increase",
  });

  const positionRequestAta = getAssociatedTokenAddressSync(
    inputMint,
    positionRequest,
    true,
  );

  const fundingAccount = getAssociatedTokenAddressSync(inputMint, owner);

  const preInstructions: TransactionInstruction[] = [];
  const postInstructions: TransactionInstruction[] = [];

  // Handle SOL wrap
  if (inputMint.equals(NATIVE_MINT)) {
    const createWrappedSolAtaIx =
      createAssociatedTokenAccountIdempotentInstruction(
        owner,
        fundingAccount,
        owner,
        NATIVE_MINT,
      );

    preInstructions.push(createWrappedSolAtaIx);

    preInstructions.push(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: fundingAccount,
        lamports: BigInt(collateralTokenDelta.toString()),
      }),
    );

    preInstructions.push(createSyncNativeInstruction(fundingAccount));

    postInstructions.push(
      createCloseAccountInstruction(fundingAccount, owner, owner),
    );
  }

  // Create open request
  const increaseIx = await program.methods
    .createIncreasePositionMarketRequest({
      counter,
      collateralTokenDelta,
      jupiterMinimumOut:
        jupiterMinimumOut && jupiterMinimumOut.gten(0)
          ? jupiterMinimumOut
          : null,
      priceSlippage,
      side,
      sizeUsdDelta,
    })
    .accounts({
      custody: custody.publicKey,
      collateralCustody: collateralCustody.publicKey,
      fundingAccount,
      inputMint,
      owner,
      perpetuals: PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        JUPITER_PERPETUALS_PROGRAM_ID,
      )[0],
      pool: JLP_POOL_ACCOUNT_PUBKEY,
      position: positionPubkey,
      positionRequest,
      positionRequestAta,
      referral: null,
    })
    .instruction();

  // Prepare sim instructions
  const instructions = [
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000,
    }),
    ...preInstructions,
    increaseIx,
    ...postInstructions,
  ];

  const simulateTx = new VersionedTransaction(
    new TransactionMessage({
      instructions,
      payerKey: owner, // Check real balance
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message([]),
  );

  // Run simulation
  const simulation = await connection.simulateTransaction(simulateTx, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  // Check sim errors
  if (simulation.value.err) {
    console.error("Simulation failed:", simulation.value.logs);
    throw new Error(
      `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
    );
  }

  // Set CU limit + 10%
  const safeUnits = simulation.value.unitsConsumed
    ? Math.ceil(simulation.value.unitsConsumed * 1.1)
    : 1_400_000;

  instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: safeUnits,
    }),
  );

  const txMessage = new TransactionMessage({
    payerKey: owner,
    recentBlockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(txMessage);

  return tx;
}

export async function constructMarketClosePositionTrade({
  connection,
  desiredMint,
  program,
  recentBlockhash,
  positionPubkey,
  priceSlippage,
  jupiterMinimumOut,
}: {
  connection: import("@solana/web3.js").Connection;
  desiredMint: PublicKey;
  program: Program<Perpetuals>;
  recentBlockhash: Blockhash;
  positionPubkey: PublicKey;
  priceSlippage: BN;
  jupiterMinimumOut: BN | null;
}) {
  const position = await program.account.position.fetch(positionPubkey);

  // Generate request PDA
  const { positionRequest, counter } = generatePositionRequestPda({
    positionPubkey,
    requestChange: "decrease",
  });

  const preInstructions: TransactionInstruction[] = [];
  const postInstructions: TransactionInstruction[] = [];

  // Get/Create receiving ATA
  const receivingAccount = getAssociatedTokenAddressSync(
    desiredMint,
    position.owner,
    true,
  );

  preInstructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      position.owner,
      receivingAccount,
      position.owner,
      desiredMint,
    ),
  );

  // Handle SOL unwrap
  if (desiredMint.equals(NATIVE_MINT)) {
    postInstructions.push(
      createCloseAccountInstruction(
        receivingAccount,
        position.owner,
        position.owner,
      ),
    );
  }

  // Create close request
  const decreaseIx = await program.methods
    .createDecreasePositionMarketRequest({
      collateralUsdDelta: new BN(0),
      sizeUsdDelta: new BN(0),
      priceSlippage: priceSlippage,
      jupiterMinimumOut:
        jupiterMinimumOut && jupiterMinimumOut.gten(0)
          ? jupiterMinimumOut
          : null,
      counter,
      entirePosition: true,
    })
    .accounts({
      owner: position.owner,
      receivingAccount,
      perpetuals: PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        JUPITER_PERPETUALS_PROGRAM_ID,
      )[0],
      pool: JLP_POOL_ACCOUNT_PUBKEY,
      position: positionPubkey,
      positionRequest,
      positionRequestAta: getAssociatedTokenAddressSync(
        desiredMint,
        positionRequest,
        true,
      ),
      custody: position.custody,
      collateralCustody: position.collateralCustody,
      desiredMint,
      referral: null,
    })
    .instruction();

  // Prepare sim instructions
  const instructions = [
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000,
    }),
    ...preInstructions,
    decreaseIx,
    ...postInstructions,
  ];

  const simulateTx = new VersionedTransaction(
    new TransactionMessage({
      instructions,
      payerKey: position.owner, // Check real balance
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message([]),
  );

  // Run simulation
  const simulation = await connection.simulateTransaction(simulateTx, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  // Check sim errors
  if (simulation.value.err) {
    console.error("Simulation failed:", simulation.value.logs);
    throw new Error(
      `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
    );
  }

  // Set CU limit + 10%
  const safeUnits = simulation.value.unitsConsumed
    ? Math.ceil(simulation.value.unitsConsumed * 1.1)
    : 1_400_000;

  instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: safeUnits,
    }),
  );
  const txMessage = new TransactionMessage({
    payerKey: position.owner,
    recentBlockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(txMessage);

  return tx;
}
