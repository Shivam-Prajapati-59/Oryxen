/**
 * Flash Trade — Adapter (client factory + trade execution).
 *
 * Moved from `adapters/flash.ts`. Uses shared wallet utilities from `@/lib/solana`.
 */

import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
  Signer,
} from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import {
  OraclePrice,
  PerpetualsClient,
  PoolConfig,
  Side,
  uiDecimalsToNative,
  PoolAccount,
  PoolDataClient,
  CustodyAccount,
  BN_ZERO,
  Privilege,
} from "flash-sdk";
import type { FlashConfig } from "../types";
import {
  getPythProgramKeyForCluster,
  PriceData,
  PythHttpClient,
} from "@pythnetwork/client";
import { createPrivyWalletAdapter } from "@/lib/solana";
import { FLASH_CONFIG } from "../constants";

// ─── Client factory ──────────────────────────────────────────────────

/**
 * Creates a fully-configured PerpetualsClient for the Flash Trade protocol.
 */
export const createFlashClient = (
  privyWallet: any,
  config: FlashConfig = FLASH_CONFIG,
) => {
  const connection = new Connection(config.rpcUrl, "processed");

  const anchorWallet = createPrivyWalletAdapter(
    privyWallet,
    config.chainPrefix,
  );

  const provider = new AnchorProvider(connection as any, anchorWallet as any, {
    commitment: "processed",
    skipPreflight: true,
  });

  const poolConfig = PoolConfig.fromIdsByName(config.poolName, config.cluster);

  const client = new PerpetualsClient(
    provider,
    poolConfig.programId,
    poolConfig.perpComposibilityProgramId,
    poolConfig.fbNftRewardProgramId,
    poolConfig.rewardDistributionProgram.programId,
    {
      prioritizationFee: config.prioritizationFee,
    },
  );

  return { client, poolConfig, connection };
};

// ─── Pyth helpers ────────────────────────────────────────────────────

const getPythClient = () => {
  const connectionFromPyth = new Connection("https://pythnet.rpcpool.com");
  return new PythHttpClient(
    connectionFromPyth,
    getPythProgramKeyForCluster("pythnet"),
  );
};

const getPrices = async (poolConfig: PoolConfig) => {
  const pythClient = getPythClient();
  const pythHttpClientResult = await pythClient.getData();

  const priceMap = new Map<
    string,
    { price: OraclePrice; emaPrice: OraclePrice }
  >();

  for (const token of poolConfig.tokens) {
    const priceData: PriceData = pythHttpClientResult.productPrice.get(
      token.pythTicker,
    )!;
    if (!priceData) {
      throw new Error(`priceData not found for ${token.symbol}`);
    }
    const priceOracle = new OraclePrice({
      price: new BN(priceData?.aggregate.priceComponent.toString()),
      exponent: new BN(priceData?.exponent),
      confidence: new BN(priceData?.confidence!),
      timestamp: new BN(priceData?.timestamp.toString()),
    });

    const emaPriceOracle = new OraclePrice({
      price: new BN(priceData?.emaPrice.valueComponent.toString()),
      exponent: new BN(priceData?.exponent),
      confidence: new BN(priceData?.emaConfidence.valueComponent.toString()),
      timestamp: new BN(priceData?.timestamp.toString()),
    });
    priceMap.set(token.symbol, {
      price: priceOracle,
      emaPrice: emaPriceOracle,
    });
  }

  return priceMap;
};

// ─── Trade execution ─────────────────────────────────────────────────

/**
 * Open a position with different collateral using swap
 * (e.g., SOL collateral to open BTC position)
 */
export const openPositionWithSwap = async (
  client: PerpetualsClient,
  poolConfig: PoolConfig,
  inputTokenSymbol: string,
  outputTokenSymbol: string,
  inputAmount: string,
  side: Side,
  leverage: number = 1.1,
  slippageBps: number = 800,
) => {
  const instructions: TransactionInstruction[] = [];
  let additionalSigners: Signer[] = [];

  const inputToken = poolConfig.tokens.find(
    (t) => t.symbol === inputTokenSymbol,
  )!;
  const outputToken = poolConfig.tokens.find(
    (t) => t.symbol === outputTokenSymbol,
  )!;

  if (!inputToken || !outputToken) {
    throw new Error(`Token not found in pool config`);
  }

  const priceMap = await getPrices(poolConfig);

  const inputTokenPrice = priceMap.get(inputToken.symbol)!.price;
  const inputTokenPriceEma = priceMap.get(inputToken.symbol)!.emaPrice;
  const outputTokenPrice = priceMap.get(outputToken.symbol)!.price;
  const outputTokenPriceEma = priceMap.get(outputToken.symbol)!.emaPrice;

  await client.loadAddressLookupTable(poolConfig);

  const priceAfterSlippage = client.getPriceAfterSlippage(
    true,
    new BN(slippageBps),
    outputTokenPrice,
    side,
  );

  const collateralWithFee = uiDecimalsToNative(
    inputAmount,
    inputToken.decimals,
  );

  const inputCustody = poolConfig.custodies.find(
    (c) => c.symbol === inputToken.symbol,
  )!;
  const outputCustody = poolConfig.custodies.find(
    (c) => c.symbol === outputToken.symbol,
  )!;

  const custodies = await client.program.account.custody.fetchMultiple([
    inputCustody.custodyAccount,
    outputCustody.custodyAccount,
  ]);

  const poolAccount = PoolAccount.from(
    poolConfig.poolAddress,
    await client.program.account.pool.fetch(poolConfig.poolAddress),
  );

  const allCustodies = await client.program.account.custody.all();

  const lpMintData = await getMint(
    client.provider.connection as any,
    poolConfig.stakedLpTokenMint,
  );

  const poolDataClient = new PoolDataClient(
    poolConfig,
    poolAccount,
    lpMintData,
    [...allCustodies.map((c) => CustodyAccount.from(c.publicKey, c.account))],
  );

  const lpStats = poolDataClient.getLpStats(await getPrices(poolConfig));

  const inputCustodyAccount = CustodyAccount.from(
    inputCustody.custodyAccount,
    custodies[0]!,
  );
  const outputCustodyAccount = CustodyAccount.from(
    outputCustody.custodyAccount,
    custodies[1]!,
  );

  const size = client.getSizeAmountWithSwapSync(
    collateralWithFee,
    leverage.toString(),
    side,
    poolAccount,
    inputTokenPrice,
    inputTokenPriceEma,
    inputCustodyAccount,
    outputTokenPrice,
    outputTokenPriceEma,
    outputCustodyAccount,
    outputTokenPrice,
    outputTokenPriceEma,
    outputCustodyAccount,
    outputTokenPrice,
    outputTokenPriceEma,
    outputCustodyAccount,
    lpStats.totalPoolValueUsd,
    poolConfig,
    uiDecimalsToNative(`0`, 2),
  );

  const openPositionData = await client.swapAndOpen(
    outputToken.symbol,
    outputToken.symbol,
    inputToken.symbol,
    collateralWithFee,
    priceAfterSlippage,
    size,
    side,
    poolConfig,
    Privilege.None,
  );

  instructions.push(...openPositionData.instructions);
  additionalSigners.push(...openPositionData.additionalSigners);

  const setCULimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 600_000,
  });

  const { addressLookupTables } = await client.getOrLoadAddressLookupTable(
    poolConfig,
  );

  const trxId = await client.sendTransaction([setCULimitIx, ...instructions], {
    additionalSigners: additionalSigners,
    alts: addressLookupTables,
  });

  console.log("Transaction executed :>> ", trxId);
  return trxId;
};

/**
 * Open a position with the same collateral
 * (e.g., BTC collateral to open BTC position)
 */
export const openPosition = async (
  client: PerpetualsClient,
  poolConfig: PoolConfig,
  outputTokenSymbol: string,
  inputTokenSymbol: string,
  collateralAmount: string,
  side: Side,
  leverage: number = 1.1,
  slippageBps: number = 800,
) => {
  const instructions: TransactionInstruction[] = [];
  let additionalSigners: Signer[] = [];

  const inputToken = poolConfig.tokens.find(
    (t) => t.symbol === inputTokenSymbol,
  )!;
  const outputToken = poolConfig.tokens.find(
    (t) => t.symbol === outputTokenSymbol,
  )!;

  const priceMap = await getPrices(poolConfig);

  const inputTokenPrice = priceMap.get(inputToken.symbol)!.price;
  const inputTokenPriceEma = priceMap.get(inputToken.symbol)!.emaPrice;
  const outputTokenPrice = priceMap.get(outputToken.symbol)!.price;
  const outputTokenPriceEma = priceMap.get(outputToken.symbol)!.emaPrice;

  await client.loadAddressLookupTable(poolConfig);

  const priceAfterSlippage = client.getPriceAfterSlippage(
    true,
    new BN(slippageBps),
    outputTokenPrice,
    side,
  );

  const collateralWithFee = uiDecimalsToNative(
    collateralAmount,
    inputToken.decimals,
  );

  const inputCustody = poolConfig.custodies.find(
    (c) => c.symbol === inputToken.symbol,
  )!;
  const outputCustody = poolConfig.custodies.find(
    (c) => c.symbol === outputToken.symbol,
  )!;

  const custodies = await client.program.account.custody.fetchMultiple([
    inputCustody.custodyAccount,
    outputCustody.custodyAccount,
  ]);

  const outputAmount = client.getSizeAmountFromLeverageAndCollateral(
    collateralWithFee,
    leverage.toString(),
    outputToken,
    inputToken,
    side,
    outputTokenPrice,
    outputTokenPriceEma,
    CustodyAccount.from(outputCustody.custodyAccount, custodies[1]!),
    inputTokenPrice,
    inputTokenPriceEma,
    CustodyAccount.from(inputCustody.custodyAccount, custodies[0]!),
    uiDecimalsToNative(`0`, 2),
  );

  const openPositionData = await client.openPosition(
    outputToken.symbol,
    inputToken.symbol,
    priceAfterSlippage,
    collateralWithFee,
    outputAmount,
    side,
    poolConfig,
    Privilege.None,
  );

  instructions.push(...openPositionData.instructions);
  additionalSigners.push(...openPositionData.additionalSigners);

  const setCULimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 600_000,
  });

  const { addressLookupTables } = await client.getOrLoadAddressLookupTable(
    poolConfig,
  );

  const trxId = await client.sendTransaction([setCULimitIx, ...instructions], {
    additionalSigners: additionalSigners,
    alts: addressLookupTables,
  });

  console.log("Transaction executed :>> ", trxId);
  return trxId;
};

/**
 * Set Take Profit and/or Stop Loss on an existing position.
 */
export const setTpAndSlForMarket = async (
  client: PerpetualsClient,
  poolConfig: PoolConfig,
  market: PublicKey,
  takeProfitPriceUi: number | undefined,
  stopLossPriceUi: number | undefined,
) => {
  const marketConfig = poolConfig.markets.find((f) =>
    f.marketAccount.equals(market),
  )!;

  if (!marketConfig) {
    throw new Error(`Market not found: ${market.toBase58()}`);
  }

  const targetCustodyConfig = poolConfig.custodies.find((c) =>
    c.custodyAccount.equals(marketConfig.targetCustody),
  )!;
  const collateralCustodyConfig = poolConfig.custodies.find((c) =>
    c.custodyAccount.equals(marketConfig.collateralCustody),
  )!;

  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Signer[] = [];
  let COMPUTE_LIMIT = 0;

  const positions = await client.getUserPositions(
    client.provider.publicKey,
    poolConfig,
  );

  const position = positions
    .filter((f) => !f.sizeAmount.isZero())
    .find((p) => p.market.equals(market));

  if (!position) {
    throw new Error(`No open position for market: ${market.toBase58()}`);
  }

  const side = marketConfig.side;

  // ── Take Profit ──────────────────────────────────────────────────
  if (takeProfitPriceUi) {
    const triggerPriceNative = uiDecimalsToNative(
      takeProfitPriceUi.toString(),
      targetCustodyConfig.decimals,
    );

    const triggerOraclePrice = new OraclePrice({
      price: new BN(triggerPriceNative.toString()),
      exponent: new BN(targetCustodyConfig.decimals).neg(),
      confidence: BN_ZERO,
      timestamp: BN_ZERO,
    });

    const triggerContractOraclePrice =
      triggerOraclePrice.toContractOraclePrice();

    const result = await client.placeTriggerOrder(
      targetCustodyConfig.symbol,
      collateralCustodyConfig.symbol,
      collateralCustodyConfig.symbol,
      side,
      triggerContractOraclePrice,
      position.sizeAmount,
      false, // isStopLoss = false → Take Profit
      poolConfig,
    );

    instructions.push(...result.instructions);
    additionalSigners.push(...result.additionalSigners);
    COMPUTE_LIMIT = 90_000;
  }

  // ── Stop Loss ────────────────────────────────────────────────────
  if (stopLossPriceUi) {
    const triggerPriceNative = uiDecimalsToNative(
      stopLossPriceUi.toString(),
      targetCustodyConfig.decimals,
    );

    const triggerOraclePrice = new OraclePrice({
      price: new BN(triggerPriceNative.toString()),
      exponent: new BN(targetCustodyConfig.decimals).neg(),
      confidence: BN_ZERO,
      timestamp: BN_ZERO,
    });

    const triggerContractOraclePrice =
      triggerOraclePrice.toContractOraclePrice();

    const result = await client.placeTriggerOrder(
      targetCustodyConfig.symbol,
      collateralCustodyConfig.symbol,
      collateralCustodyConfig.symbol,
      side,
      triggerContractOraclePrice,
      position.sizeAmount,
      true, // isStopLoss = true → Stop Loss
      poolConfig,
    );

    instructions.push(...result.instructions);
    additionalSigners.push(...result.additionalSigners);
    COMPUTE_LIMIT = COMPUTE_LIMIT + 90_000;
  }

  const setCULimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: COMPUTE_LIMIT,
  });

  const { addressLookupTables } = await client.getOrLoadAddressLookupTable(
    poolConfig,
  );

  const trxId = await client.sendTransaction([setCULimitIx, ...instructions], {
    additionalSigners,
    alts: addressLookupTables,
  });

  console.log("TP/SL transaction executed :>> ", trxId);
  return trxId;
};

/**
 * Get available tokens in the pool.
 */
export const getAvailableTokens = (poolConfig: PoolConfig) => {
  return poolConfig.tokens.map((token) => ({
    symbol: token.symbol,
    decimals: token.decimals,
    mintKey: token.mintKey.toString(),
  }));
};

export { Side };
