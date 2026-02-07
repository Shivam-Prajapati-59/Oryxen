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
 *
 * @param privyWallet - Connected Privy Solana wallet instance
 * @param config      - Optional override config (defaults to FLASH_CONFIG)
 * @returns           - { client, poolConfig, connection }
 */
export const createFlashClient = (
  privyWallet: any,
  config: FlashConfig = FLASH_CONFIG,
) => {
  // 1. Solana connection — use the config's RPC URL, not a hardcoded mainnet one
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

// Pyth Price Fetcher (via Hermes HTTP API)
export interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

export const getPythPriceData = async (
  priceIds: string[],
): Promise<PythPriceData[]> => {
  const hermesUrl =
    process.env.NEXT_PUBLIC_HERMES_URL || "https://hermes.pyth.network";

  const params = new URLSearchParams();
  priceIds.forEach((id) => {
    // Strip 0x prefix for query param — Hermes accepts both but be safe
    params.append("ids[]", id);
  });

  const response = await fetch(
    `${hermesUrl}/api/latest_price_feeds?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Hermes API error: ${response.status} ${response.statusText}`,
    );
  }

  const data: PythPriceData[] = await response.json();
  return data;
};

export const getPrices = async (
  poolConfig: PoolConfig,
): Promise<Map<string, { price: OraclePrice; emaPrice: OraclePrice }>> => {
  // Deduplicate price IDs (SOL and WSOL share the same pythPriceId)
  const tokensByPriceId = new Map<string, typeof poolConfig.tokens>();
  for (const token of poolConfig.tokens) {
    const id = token.pythPriceId;
    if (!tokensByPriceId.has(id)) {
      tokensByPriceId.set(id, []);
    }
    tokensByPriceId.get(id)!.push(token);
  }

  const uniquePriceIds = Array.from(tokensByPriceId.keys());
  const hermesData = await getPythPriceData(uniquePriceIds);

  // Build a lookup: normalised id (no 0x, lowercase) → PythPriceData
  const hermesById = new Map<string, PythPriceData>();
  for (const feed of hermesData) {
    hermesById.set(feed.id.replace(/^0x/, "").toLowerCase(), feed);
  }

  const priceMap = new Map<
    string,
    { price: OraclePrice; emaPrice: OraclePrice }
  >();

  for (const token of poolConfig.tokens) {
    const normId = token.pythPriceId.replace(/^0x/, "").toLowerCase();
    const feed = hermesById.get(normId);

    if (!feed) {
      throw new Error(
        `Hermes price not found for ${token.symbol} (pythPriceId: ${token.pythPriceId})`,
      );
    }

    // Hermes returns: price.price (string integer), price.expo (negative int),
    // price.conf (string integer), price.publish_time (unix seconds)
    const priceOracle = new OraclePrice({
      price: new BN(feed.price.price),
      exponent: new BN(feed.price.expo),
      confidence: new BN(feed.price.conf),
      timestamp: new BN(feed.price.publish_time),
    });

    const emaPriceOracle = new OraclePrice({
      price: new BN(feed.ema_price.price),
      exponent: new BN(feed.ema_price.expo),
      confidence: new BN(feed.ema_price.conf),
      timestamp: new BN(feed.ema_price.publish_time),
    });

    priceMap.set(token.symbol, {
      price: priceOracle,
      emaPrice: emaPriceOracle,
    });
  }

  return priceMap;
};

// Open Position With Swap

/**
 * Opens a perpetual position using a swap (e.g. SOL → USDC collateral → long BTC).
 *
 * SDK method: `swapAndOpen(targetTokenSymbol, collateralTokenSymbol, userInputTokenSymbol,
 *   amountIn, priceWithSlippage, sizeAmount, side, poolConfig, privilege)`
 *
 * @param client           - Initialized PerpetualsClient
 * @param poolConfig       - Pool config for the target cluster
 * @param inputTokenSymbol - Token the user is depositing (e.g. "SOL")
 * @param targetTokenSymbol - Token to trade (e.g. "BTC")
 * @param collateralTokenSymbol - Collateral token (e.g. "USDC")
 * @param inputAmount      - Human-readable amount of input token
 * @param side             - Side.Long or Side.Short
 * @param leverage         - Desired leverage (e.g. 1.1)
 * @param slippageBps      - Slippage in basis points (e.g. 800 = 0.8%)
 */
export const openPositionWithSwap = async (
  client: PerpetualsClient,
  poolConfig: PoolConfig,
  connection: Connection,
  inputTokenSymbol: string,
  targetTokenSymbol: string,
  collateralTokenSymbol: string,
  inputAmount: string,
  side: typeof Side.Long | typeof Side.Short,
  leverage: number = 1.1,
  slippageBps: number = 800,
): Promise<string> => {
  const instructions: TransactionInstruction[] = [];
  let additionalSigners: Signer[] = [];

  const inputToken = poolConfig.tokens.find(
    (t) => t.symbol === inputTokenSymbol,
  )!;
  const targetToken = poolConfig.tokens.find(
    (t) => t.symbol === targetTokenSymbol,
  )!;
  const collateralToken = poolConfig.tokens.find(
    (t) => t.symbol === collateralTokenSymbol,
  )!;

  if (!inputToken || !targetToken || !collateralToken) {
    throw new Error(
      `Token not found in pool config: input=${inputTokenSymbol}, target=${targetTokenSymbol}, collateral=${collateralTokenSymbol}`,
    );
  }

  // 1. Fetch oracle prices
  const priceMap = await getPrices(poolConfig);

  const inputTokenPrice = priceMap.get(inputToken.symbol)!.price;
  const inputTokenPriceEma = priceMap.get(inputToken.symbol)!.emaPrice;
  const targetTokenPrice = priceMap.get(targetToken.symbol)!.price;
  const targetTokenPriceEma = priceMap.get(targetToken.symbol)!.emaPrice;
  const collateralTokenPrice = priceMap.get(collateralToken.symbol)!.price;
  const collateralTokenPriceEma = priceMap.get(
    collateralToken.symbol,
  )!.emaPrice;

  // 2. Load ALTs
  await client.loadAddressLookupTable(poolConfig);

  // 3. Calculate slippage-adjusted price
  const priceAfterSlippage = client.getPriceAfterSlippage(
    true, // isEntry
    new BN(slippageBps),
    targetTokenPrice,
    side,
  );

  // 4. Convert input amount to native units
  const collateralWithFee = uiDecimalsToNative(
    inputAmount,
    inputToken.decimals,
  );

  // 5. Fetch on-chain custody & pool accounts
  const inputCustody = poolConfig.custodies.find(
    (c) => c.symbol === inputToken.symbol,
  )!;
  const targetCustody = poolConfig.custodies.find(
    (c) => c.symbol === targetToken.symbol,
  )!;
  const collateralCustody = poolConfig.custodies.find(
    (c) => c.symbol === collateralToken.symbol,
  )!;

  const [inputCustodyData, targetCustodyData, collateralCustodyData] =
    await client.program.account.custody.fetchMultiple([
      inputCustody.custodyAccount,
      targetCustody.custodyAccount,
      collateralCustody.custodyAccount,
    ]);

  const poolAccount = PoolAccount.from(
    poolConfig.poolAddress,
    await client.program.account.pool.fetch(poolConfig.poolAddress),
  );

  // 6. Build custody account wrappers
  const inputCustodyAccount = CustodyAccount.from(
    inputCustody.custodyAccount,
    inputCustodyData!,
  );
  const targetCustodyAccount = CustodyAccount.from(
    targetCustody.custodyAccount,
    targetCustodyData!,
  );
  const collateralCustodyAccount = CustodyAccount.from(
    collateralCustody.custodyAccount,
    collateralCustodyData!,
  );

  // 7. Calculate LP stats (needed for pool AUM)
  const allCustodies = await client.program.account.custody.all();
  const lpMintData = await getMint(
    connection as any,
    poolConfig.stakedLpTokenMint,
  );
  const poolDataClient = new PoolDataClient(
    poolConfig,
    poolAccount,
    lpMintData,
    allCustodies.map((c) => CustodyAccount.from(c.publicKey, c.account)),
  );
  const lpStats = poolDataClient.getLpStats(priceMap);

  // 8. Calculate position size from leverage & collateral
  const size = client.getSizeAmountWithSwapSync(
    collateralWithFee,
    leverage.toString(),
    side,
    poolAccount,
    inputTokenPrice,
    inputTokenPriceEma,
    inputCustodyAccount,
    collateralTokenPrice,
    collateralTokenPriceEma,
    collateralCustodyAccount,
    targetTokenPrice,
    targetTokenPriceEma,
    targetCustodyAccount,
    targetTokenPrice,
    targetTokenPriceEma,
    targetCustodyAccount,
    lpStats.totalPoolValueUsd,
    poolConfig,
    uiDecimalsToNative("5", 2), // trading discount (NFT level dependent)
  );

  const openPositionData = await client.swapAndOpen(
    targetToken.symbol,
    collateralToken.symbol,
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

  // 10. Set compute unit limit and send transaction
  const setCULimitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 600_000,
  });

  const { addressLookupTables } = await client.getOrLoadAddressLookupTable(
    poolConfig,
  );

  const txSignature = await client.sendTransaction(
    [setCULimitIx, ...instructions],
    {
      additionalSigners,
      alts: addressLookupTables,
    },
  );

  console.log("[Flash] openPositionWithSwap tx:", txSignature);
  return txSignature;
};
