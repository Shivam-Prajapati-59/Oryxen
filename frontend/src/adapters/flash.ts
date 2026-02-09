import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
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
  BPS_DECIMALS,
  Privilege,
} from "flash-sdk";
import type { FlashConfig, FlashCluster, FlashPoolName } from "@/types/flash";
import {
  getPythProgramKeyForCluster,
  PriceData,
  PythHttpClient,
} from "@pythnetwork/client";

// Environment Configuration
const FLASH_ENV: FlashCluster = "devnet"; // Change to "mainnet-beta" for production

const FLASH_RPC_URLS: Record<FlashCluster, string> = {
  devnet:
    process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC ||
    "https://api.devnet.solana.com",
  "mainnet-beta":
    process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com",
};

const FLASH_POOL_NAMES: Record<FlashCluster, FlashPoolName> = {
  devnet: "devnet.1",
  "mainnet-beta": "Crypto.1",
};

const FLASH_CHAIN_PREFIX: Record<FlashCluster, string> = {
  devnet: "solana:devnet",
  "mainnet-beta": "solana:mainnet",
};

/** Resolved configuration for the current environment */
export const FLASH_CONFIG: FlashConfig = {
  cluster: FLASH_ENV,
  poolName: FLASH_POOL_NAMES[FLASH_ENV],
  rpcUrl: FLASH_RPC_URLS[FLASH_ENV],
  chainPrefix: FLASH_CHAIN_PREFIX[FLASH_ENV],
  prioritizationFee: 0,
};

// Utility Functions

/** Validate base58 Solana address (exclude EVM 0x addresses) */
export const isValidSolanaAddress = (address: string): boolean => {
  if (!address || address.startsWith("0x")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

/** Check if a transaction is a VersionedTransaction */
const isVersionedTransaction = (
  tx: Transaction | VersionedTransaction,
): tx is VersionedTransaction => {
  return (
    "version" in tx ||
    tx.constructor.name === "VersionedTransaction" ||
    typeof (tx as any).message?.version === "number"
  );
};

/**
 * Wraps a Privy wallet into an Anchor-compatible wallet interface so the
 * Flash SDK PerpetualsClient can sign transactions through Privy.
 */
export const createPrivyWalletAdapter = (
  privyWallet: any,
  chainPrefix: string,
) => {
  const publicKey = new PublicKey(privyWallet.address);

  return {
    publicKey,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      tx: T,
    ): Promise<T> => {
      let serialized: Uint8Array;

      if (isVersionedTransaction(tx)) {
        serialized = tx.serialize();
      } else {
        serialized = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
      }

      const result = await privyWallet.signTransaction({
        chain: chainPrefix,
        transaction: serialized,
      });

      const signedBytes = new Uint8Array(result.signedTransaction);

      if (isVersionedTransaction(tx)) {
        return VersionedTransaction.deserialize(signedBytes) as T;
      } else {
        return Transaction.from(signedBytes) as T;
      }
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> => {
      const signed: T[] = [];
      for (const tx of txs) {
        let serialized: Uint8Array;
        if (isVersionedTransaction(tx)) {
          serialized = tx.serialize();
        } else {
          serialized = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });
        }

        const result = await privyWallet.signTransaction({
          chain: chainPrefix,
          transaction: serialized,
        });

        const signedBytes = new Uint8Array(result.signedTransaction);
        if (isVersionedTransaction(tx)) {
          signed.push(VersionedTransaction.deserialize(signedBytes) as T);
        } else {
          signed.push(Transaction.from(signedBytes) as T);
        }
      }
      return signed;
    },
  };
};

/**
 * Creates a fully-configured PerpetualsClient for the Flash Trade protocol.
 * This factory should be called when you have a connected Privy wallet.
 */
export const createFlashClient = (
  privyWallet: any,
  config: FlashConfig = FLASH_CONFIG,
) => {
  // 1. Solana connection — use the config's RPC URL
  const connection = new Connection(config.rpcUrl, "processed");

  // 2. Anchor wallet adapter from Privy wallet
  const anchorWallet = createPrivyWalletAdapter(
    privyWallet,
    config.chainPrefix,
  );

  // 3. Anchor provider
  const provider = new AnchorProvider(connection as any, anchorWallet as any, {
    commitment: "processed",
    skipPreflight: true,
  });

  // 4. Load pool config for the target cluster + pool
  const poolConfig = PoolConfig.fromIdsByName(config.poolName, config.cluster);

  // 5. Instantiate the PerpetualsClient
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

/**
 * Setup Pyth pricing data
 */
const getPythClient = () => {
  const connectionFromPyth = new Connection("https://pythnet.rpcpool.com");
  return new PythHttpClient(
    connectionFromPyth,
    getPythProgramKeyForCluster("pythnet"),
  );
};

/**
 * Fetch current prices from Pyth for all pool tokens
 */
const getPrices = async (poolConfig: PoolConfig) => {
  const pythClient = getPythClient();
  const pythHttpClientResult = await pythClient.getData();

  const priceMap = new Map<
    string,
    { price: OraclePrice; emaPrice: OraclePrice }
  >();

  for (let token of poolConfig.tokens) {
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

  // Load address lookup table for transaction optimization
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

  // Fetch custody data
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

  let lpStats = poolDataClient.getLpStats(await getPrices(poolConfig));

  const inputCustodyAccount = CustodyAccount.from(
    inputCustody.custodyAccount,
    custodies[0]!,
  );
  const outputCustodyAccount = CustodyAccount.from(
    outputCustody.custodyAccount,
    custodies[1]!,
  );

  // Calculate size with swap - Flash SDK takes 19 params per docs
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
    uiDecimalsToNative(`0`, 2), // 0 = no NFT discount; set 1-5 if user holds a Flash Beast NFT
  );

  // Execute swap and open
  // SDK signature: (target, collateral, input, amountIn, priceWithSlippage, sizeAmount, side, poolConfig, privilege)
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

  // Retrieve loaded ALTs — required for VersionedTransaction account resolution
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
    uiDecimalsToNative(`0`, 2), // 0 = no NFT discount; set 1-5 if user holds a Flash Beast NFT
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

  // Retrieve loaded ALTs — required for VersionedTransaction account resolution
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
 *
 * NOTE:
 * - Stop Loss: must be above Liquidation Price and below Current Price for LONG;
 *              must be above Current Price for SHORT
 * - Take Profit: must be above Current Price for LONG;
 *                must be below Current Price for SHORT
 *
 * @param client        - Initialized PerpetualsClient
 * @param poolConfig    - Pool config for the target cluster
 * @param market        - The market PublicKey (e.g. SOL-Long market account)
 * @param takeProfitPriceUi - TP price in USD (or undefined to skip)
 * @param stopLossPriceUi   - SL price in USD (or undefined to skip)
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

  // Find the user's open position for this market
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
      collateralCustodyConfig.symbol, // receiveSymbol — receive collateral token back
      side,
      triggerContractOraclePrice,
      position.sizeAmount, // full size; can be partial
      false, // isStopLoss = false → this is a Take Profit
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
      collateralCustodyConfig.symbol, // receiveSymbol
      side,
      triggerContractOraclePrice,
      position.sizeAmount, // full size; can be partial
      true, // isStopLoss = true → this is a Stop Loss
      poolConfig,
    );

    instructions.push(...result.instructions);
    additionalSigners.push(...result.additionalSigners);
    COMPUTE_LIMIT = COMPUTE_LIMIT + 90_000;
  }

  const setCULimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: COMPUTE_LIMIT,
  });

  // Retrieve loaded ALTs — required for VersionedTransaction account resolution
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
 * Get available tokens in the pool
 */
export const getAvailableTokens = (poolConfig: PoolConfig) => {
  return poolConfig.tokens.map((token) => ({
    symbol: token.symbol,
    decimals: token.decimals,
    mintKey: token.mintKey.toString(),
  }));
};

// Export Side enum for component use
export { Side };
