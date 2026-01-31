"use client";

import {
  DriftClient,
  User,
  initialize,
  IWallet,
  BN,
  OptionalOrderParams,
  OrderType,
  MarketType,
  PostOnlyParams,
  PositionDirection,
  OrderTriggerCondition,
} from "@drift-labs/sdk-browser";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useWallets } from "@privy-io/react-auth/solana";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ExecuteTradeParams,
  toOrderType,
  toPositionDirection,
  getTriggerCondition,
  TradeResult,
} from "@/types/drift";

// Environment configuration
const DRIFT_ENV = "devnet"; // Change to "mainnet-beta" for production
const RPC_URL =
  DRIFT_ENV === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";

/**
 * Helper to validate if a string is a valid base58 Solana address
 */
const isValidSolanaAddress = (address: string): boolean => {
  if (!address || address.startsWith("0x")) return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
};

/**
 * Check if transaction is a VersionedTransaction
 * Uses multiple checks because instanceof can fail across module versions
 */
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
 * Create a Privy-compatible wallet adapter for Drift SDK
 * This adapts Privy's wallet interface to work with Drift's IWallet interface
 * Supports both legacy Transaction and VersionedTransaction
 */
const createPrivyWalletAdapter = (
  privyWallet: any,
  chainPrefix: string,
): IWallet => {
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

      // Use Uint8Array directly instead of Buffer for browser compatibility
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
      const signedTxs: T[] = [];

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
          signedTxs.push(VersionedTransaction.deserialize(signedBytes) as T);
        } else {
          signedTxs.push(Transaction.from(signedBytes) as T);
        }
      }

      return signedTxs;
    },
  };
};

export const useDrift = () => {
  const { wallets } = useWallets();
  const [driftClient, setDriftClient] = useState<DriftClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userAccountExists, setUserAccountExists] = useState<boolean | null>(
    null,
  );
  const connectionRef = useRef<Connection | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const driftClientRef = useRef<DriftClient | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // Get the first connected Solana wallet from Privy
  // Using useWallets from @privy-io/react-auth/solana returns only Solana wallets
  const privyWallet = useMemo(() => {
    const solanaWallet = wallets.find((w) => isValidSolanaAddress(w.address));
    return solanaWallet || null;
  }, [wallets]);

  const connection = useMemo(() => {
    if (!connectionRef.current) {
      connectionRef.current = new Connection(RPC_URL, "confirmed");
    }
    return connectionRef.current;
  }, []);

  const sdkConfig = useMemo(() => initialize({ env: DRIFT_ENV }), []);

  const chainPrefix =
    DRIFT_ENV === "devnet" ? "solana:devnet" : "solana:mainnet";

  // Initialize DriftClient with Privy wallet
  const initializeDriftClient = useCallback(async () => {
    if (!privyWallet) {
      setError("No Privy wallet connected");
      return null;
    }

    // Prevent duplicate initialization
    if (isInitializingRef.current || driftClientRef.current) {
      return driftClientRef.current;
    }

    isInitializingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const wallet = createPrivyWalletAdapter(privyWallet, chainPrefix);

      const client = new DriftClient({
        connection,
        wallet,
        env: DRIFT_ENV,
        programID: new PublicKey(sdkConfig.DRIFT_PROGRAM_ID),
      });

      await client.subscribe();

      // Check if still mounted before updating state
      if (!isMountedRef.current) {
        await client.unsubscribe();
        return null;
      }

      driftClientRef.current = client;
      setDriftClient(client);
      setIsInitialized(true);

      // Try to get the user account
      try {
        const driftUser = client.getUser();
        setUser(driftUser);
        setUserAccountExists(true);
      } catch {
        // User account may not exist yet
        console.log("User account not found - may need to initialize");
        setUserAccountExists(false);
      }

      return client;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize Drift";
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      console.error("Drift initialization error:", err);
      return null;
    } finally {
      isInitializingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [privyWallet, connection, sdkConfig, chainPrefix]);

  // Initialize user account if it doesn't exist
  const initializeUserAccount = useCallback(
    async (subAccountId: number = 0, name: string = "Main Account") => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      if (!isMountedRef.current) return null;
      setIsLoading(true);
      setError(null);

      try {
        const [txSig, userPublicKey] = await driftClient.initializeUserAccount(
          subAccountId,
          name,
        );
        console.log("User account initialized:", userPublicKey.toString());
        console.log("Transaction signature:", txSig);

        // Update user after initialization
        if (isMountedRef.current) {
          const driftUser = driftClient.getUser();
          setUser(driftUser);
          setUserAccountExists(true);
        }

        return { txSig, userPublicKey };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to initialize user account";
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [driftClient],
  );

  const deposit = useCallback(
    async (
      amount: number,
      marketIndex: number = 0,
      subAccountId: number = 0,
    ) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      if (!privyWallet) {
        throw new Error("No wallet connected");
      }

      if (!isMountedRef.current) return null;
      setIsLoading(true);
      setError(null);

      try {
        // Convert amount to the correct precision for the spot market
        const depositAmount = driftClient.convertToSpotPrecision(
          marketIndex,
          amount,
        );

        // Get the associated token account for this market
        const associatedTokenAccount =
          await driftClient.getAssociatedTokenAccount(marketIndex);

        // Get wallet public key
        const walletPublicKey = new PublicKey(privyWallet.address);

        // Check balance before deposit
        let tokenBalance: number;

        if (associatedTokenAccount.equals(walletPublicKey)) {
          // For SOL - balance is on the wallet public key
          tokenBalance = await connection.getBalance(walletPublicKey);
        } else {
          // For other tokens - use the ATA balance
          const tokenAccountInfo = await connection.getTokenAccountBalance(
            associatedTokenAccount,
          );
          tokenBalance = Number(tokenAccountInfo.value.amount);
        }

        // Validate sufficient balance
        if (depositAmount.gt(new BN(tokenBalance))) {
          throw new Error(
            `Insufficient balance. You have ${tokenBalance} but need ${depositAmount.toString()}`,
          );
        }

        // Create and send the deposit transaction
        const tx = await driftClient.createDepositTxn(
          depositAmount,
          marketIndex,
          associatedTokenAccount,
          subAccountId,
        );

        const { txSig } = await driftClient.sendTransaction(
          tx,
          [],
          driftClient.opts,
        );

        const explorerUrl =
          DRIFT_ENV === "devnet"
            ? `https://solscan.io/tx/${txSig}?cluster=devnet`
            : `https://solscan.io/tx/${txSig}`;

        return { txSig, explorerUrl };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to deposit";
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [driftClient, privyWallet, connection],
  );

  const withdraw = useCallback(
    async (
      amount: number,
      marketIndex: number = 0,
      subAccountId: number = 0,
    ) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      if (!privyWallet) {
        throw new Error("No wallet connected");
      }

      if (!isMountedRef.current) return null;
      setIsLoading(true);
      setError(null);

      try {
        // Convert amount to the correct precision for the spot market
        const withdrawAmount = driftClient.convertToSpotPrecision(
          marketIndex,
          amount,
        );

        // Get the associated token account for this market
        const associatedTokenAccount =
          await driftClient.getAssociatedTokenAccount(marketIndex);

        // Call the withdraw method directly - it handles the transaction
        const txSig = await driftClient.withdraw(
          withdrawAmount,
          marketIndex,
          associatedTokenAccount,
          false, // reduceOnly - set to false to allow creating a borrow if needed
          subAccountId,
        );

        const explorerUrl =
          DRIFT_ENV === "devnet"
            ? `https://solscan.io/tx/${txSig}?cluster=devnet`
            : `https://solscan.io/tx/${txSig}`;

        return { txSig, explorerUrl };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to withdraw";
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [driftClient, privyWallet, connection],
  );

  const placeOrder = useCallback(
    async (params: ExecuteTradeParams): Promise<TradeResult> => {
      if (!driftClient) throw new Error("Drift client not initialized");
      if (!isInitialized)
        throw new Error("Drift client is not fully initialized");

      // Input validation
      if (!params.marketIndex && params.marketIndex !== 0) {
        throw new Error("Market index is required");
      }
      if (!params.direction) {
        throw new Error("Trade direction is required");
      }
      if (!params.baseAssetAmount || params.baseAssetAmount <= 0) {
        throw new Error("Base asset amount must be greater than 0");
      }

      if (!isMountedRef.current) return { txSig: "", explorerUrl: "" };
      setIsLoading(true);
      setError(null);

      try {
        const {
          marketIndex,
          orderVariant,
          baseAssetAmount,
          price: uiPrice,
          triggerPrice: uiTriggerPrice,
          startPrice,
          endPrice,
          orderCount,
          direction: uiDirection,
          reduceOnly,
          postOnly,
          subAccountId = 0, // Default to subaccount 0
        } = params;

        const direction = toPositionDirection(uiDirection);
        const orderType = toOrderType(orderVariant);

        // ============================================
        // CASE 1: SCALE ORDERS (Batch)
        // ============================================
        if (orderVariant === "scale") {
          if (!startPrice || !endPrice || !orderCount || orderCount < 2) {
            throw new Error(
              "Scale orders require startPrice, endPrice, and orderCount >= 2",
            );
          }

          const orderParamsList: OptionalOrderParams[] = [];
          const step = (endPrice - startPrice) / (orderCount - 1);

          // Calculate individual order size (Total Amount / Count)
          const singleOrderSize = baseAssetAmount / orderCount;
          const baseAmountBN =
            driftClient.convertToPerpPrecision(singleOrderSize);

          for (let i = 0; i < orderCount; i++) {
            const priceLevel = startPrice + step * i;
            const priceBN = driftClient.convertToPricePrecision(priceLevel);

            orderParamsList.push({
              orderType: OrderType.LIMIT, // Scale orders are always Limit orders
              marketType: MarketType.PERP,
              marketIndex,
              direction,
              baseAssetAmount: baseAmountBN,
              price: priceBN,
              reduceOnly: reduceOnly || false,
              postOnly: postOnly
                ? PostOnlyParams.MUST_POST_ONLY
                : PostOnlyParams.NONE,
            });
          }

          // Get the order instructions
          const orderIxs = await driftClient.getPlaceOrdersIx(
            orderParamsList,
            subAccountId,
          );

          // Build transaction from instructions
          const tx = await driftClient.buildTransaction(orderIxs);

          // Send the transaction (wallet adapter will handle signing)
          const { txSig } = await driftClient.sendTransaction(
            tx,
            [],
            driftClient.opts,
          );

          return {
            txSig,
            explorerUrl: `https://solscan.io/tx/${txSig}${
              DRIFT_ENV === "devnet" ? "?cluster=devnet" : ""
            }`,
          };
        }

        // ============================================
        // CASE 2: SINGLE ORDERS (Market, Limit, Trigger)
        // ============================================

        // 1. Convert Base Amount
        const baseAmountBN =
          driftClient.convertToPerpPrecision(baseAssetAmount);

        // 2. Calculate Price (BN)
        let priceBN: BN | undefined;

        if (orderVariant === "market") {
          // MARKET ORDER: For market orders, we don't set a price
          // The SDK will handle it automatically
          priceBN = undefined;
        } else {
          // LIMIT / TRIGGER: Use user input
          if (uiPrice === undefined)
            throw new Error("Price is required for this order type");
          priceBN = driftClient.convertToPricePrecision(uiPrice);
        }

        // 3. Calculate Trigger Price (if needed)
        let triggerPriceBN: BN | undefined;
        let triggerCondition: OrderTriggerCondition | undefined;

        if (orderVariant === "takeProfit" || orderVariant === "stopLimit") {
          if (uiTriggerPrice === undefined)
            throw new Error("Trigger price is required");
          triggerPriceBN = driftClient.convertToPricePrecision(uiTriggerPrice);
          triggerCondition = getTriggerCondition(orderVariant, uiDirection);
        }

        // 4. Construct Order Params
        const orderParams: OptionalOrderParams = {
          orderType,
          marketType: MarketType.PERP,
          marketIndex,
          direction,
          baseAssetAmount: baseAmountBN,
          reduceOnly: reduceOnly || false,
          postOnly: postOnly
            ? PostOnlyParams.MUST_POST_ONLY
            : PostOnlyParams.NONE,
        };

        // Only add price for non-market orders
        if (priceBN !== undefined) {
          orderParams.price = priceBN;
        }

        // Add trigger params for trigger orders
        if (triggerPriceBN !== undefined) {
          orderParams.triggerPrice = triggerPriceBN;
          orderParams.triggerCondition = triggerCondition;
        }

        // 5. Get the order instruction using getPlacePerpOrderIx
        const orderIx = await driftClient.getPlacePerpOrderIx(
          orderParams,
          subAccountId,
        );

        // 6. Build transaction from instructions
        const tx = await driftClient.buildTransaction(orderIx);

        // 7. Send the transaction (wallet adapter will handle signing)
        const { txSig } = await driftClient.sendTransaction(
          tx,
          [],
          driftClient.opts,
        );

        return {
          txSig,
          explorerUrl: `https://solscan.io/tx/${txSig}${
            DRIFT_ENV === "devnet" ? "?cluster=devnet" : ""
          }`,
        };
      } catch (err) {
        let msg = err instanceof Error ? err.message : "Trade execution failed";

        // Parse common Drift error codes for better UX
        if (
          msg.includes("0x1773") ||
          msg.includes("6003") ||
          msg.includes("InsufficientCollateral")
        ) {
          msg =
            "Insufficient collateral. Please deposit more funds or reduce your position size/leverage.";
        } else if (
          msg.includes("0x66") ||
          msg.includes("102") ||
          msg.includes("InstructionDidNotDeserialize")
        ) {
          msg = "Order parameters invalid. Please check your inputs.";
        } else if (msg.includes("0x1") || msg.includes("InsufficientFunds")) {
          msg = "Insufficient funds in wallet.";
        }

        if (isMountedRef.current) {
          setError(msg);
        }
        throw new Error(msg);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [driftClient, isInitialized], // Dependencies
  );

  // Utility to clear errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup subscription on unmount or when client changes
  useEffect(() => {
    return () => {
      if (driftClientRef.current) {
        driftClientRef.current.unsubscribe().catch(console.error);
        driftClientRef.current = null;
      }
    };
  }, []);

  // Reset state when wallet changes
  useEffect(() => {
    if (!privyWallet && driftClientRef.current) {
      driftClientRef.current.unsubscribe().catch(console.error);
      driftClientRef.current = null;
      setDriftClient(null);
      setIsInitialized(false);
      setUser(null);
      setUserAccountExists(null);
      setError(null);
    }
  }, [privyWallet]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!driftClient || !isMountedRef.current) return;
    try {
      await driftClient.fetchAccounts();
      const driftUser = driftClient.getUser();
      if (isMountedRef.current) {
        setUser(driftUser);
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
    }
  }, [driftClient]);

  return {
    // State
    driftClient,
    isInitialized,
    isLoading,
    error,
    user,
    userAccountExists,
    solanaWallet: privyWallet,
    connection,

    // Actions
    initializeDriftClient,
    initializeUserAccount,
    deposit,
    withdraw,
    placeOrder,
    clearError,
    refreshUser,

    // Helper to get user's free collateral
    getFreeCollateral: useCallback(() => {
      if (!user) return null;
      try {
        const freeCollateral = user.getFreeCollateral();
        // Convert from QUOTE_PRECISION (1e6) to human readable
        return freeCollateral.toNumber() / 1e6;
      } catch {
        return null;
      }
    }, [user]),

    // Helper to get total collateral
    getTotalCollateral: useCallback(() => {
      if (!user) return null;
      try {
        const totalCollateral = user.getTotalCollateral();
        return totalCollateral.toNumber() / 1e6;
      } catch {
        return null;
      }
    }, [user]),

    // Helper to check if user can afford a trade
    canAffordTrade: useCallback(
      (baseAssetAmount: number, marketIndex: number) => {
        if (!user || !driftClient)
          return { canAfford: false, reason: "Not initialized" };
        try {
          const freeCollateral = user.getFreeCollateral();
          const freeCollateralUsd = freeCollateral.toNumber() / 1e6;

          // Get oracle price for the market
          const oracleData =
            driftClient.getOracleDataForPerpMarket(marketIndex);
          const oraclePrice = oracleData.price.toNumber() / 1e6; // PRICE_PRECISION

          // Estimate position value
          const positionValue = baseAssetAmount * oraclePrice;

          // Rough margin requirement estimate (initial margin ~5% for most markets)
          const estimatedMargin = positionValue * 0.05;

          if (freeCollateralUsd < estimatedMargin) {
            return {
              canAfford: false,
              reason: `Insufficient collateral. You have $${freeCollateralUsd.toFixed(
                2,
              )} free, but need ~$${estimatedMargin.toFixed(2)} margin.`,
              freeCollateral: freeCollateralUsd,
              requiredMargin: estimatedMargin,
            };
          }

          return {
            canAfford: true,
            freeCollateral: freeCollateralUsd,
            requiredMargin: estimatedMargin,
          };
        } catch (err) {
          return { canAfford: false, reason: "Could not calculate margin" };
        }
      },
      [user, driftClient],
    ),

    // Get current oracle price for a perp market
    getOraclePrice: useCallback(
      (marketIndex: number): number | null => {
        if (!driftClient) return null;
        try {
          const oracleData =
            driftClient.getOracleDataForPerpMarket(marketIndex);
          // PRICE_PRECISION is 1e6
          return oracleData.price.toNumber() / 1e6;
        } catch {
          return null;
        }
      },
      [driftClient],
    ),

    // Get perp market account for fee/funding info
    getPerpMarketInfo: useCallback(
      (marketIndex: number) => {
        if (!driftClient) return null;
        try {
          const market = driftClient.getPerpMarketAccount(marketIndex);
          if (!market) return null;

          // Get oracle price
          const oracleData =
            driftClient.getOracleDataForPerpMarket(marketIndex);
          const oraclePrice = oracleData.price.toNumber() / 1e6;

          // Fee tier - taker fee is typically 0.1% (10 bps), maker fee is 0 or rebate
          // Default fees for Drift Protocol
          const takerFee = 0.001; // 0.1% taker fee
          const makerFee = 0; // Maker fee is typically 0 or rebate

          // Funding rate - stored as hourly rate
          // FUNDING_RATE_PRECISION is 1e9
          const lastFundingRate = market.amm?.lastFundingRate
            ? market.amm.lastFundingRate.toNumber() / 1e9
            : 0;

          // Convert hourly funding to 8-hour and annualized
          const fundingRate8h = lastFundingRate * 8;
          const fundingRateAnnualized = lastFundingRate * 24 * 365;

          // Mark price from AMM
          const markPrice = market.amm?.lastMarkPriceTwap
            ? market.amm.lastMarkPriceTwap.toNumber() / 1e6
            : oraclePrice;

          // Open interest
          const baseAssetAmountLong = market.amm?.baseAssetAmountLong
            ? market.amm.baseAssetAmountLong.abs().toNumber() / 1e9
            : 0;
          const baseAssetAmountShort = market.amm?.baseAssetAmountShort
            ? market.amm.baseAssetAmountShort.abs().toNumber() / 1e9
            : 0;

          return {
            oraclePrice,
            markPrice,
            takerFee,
            makerFee,
            fundingRate: lastFundingRate,
            fundingRate8h,
            fundingRateAnnualized,
            openInterestLong: baseAssetAmountLong,
            openInterestShort: baseAssetAmountShort,
          };
        } catch (err) {
          console.error("Error getting perp market info:", err);
          return null;
        }
      },
      [driftClient],
    ),

    // Calculate trade details for pre-trade summary
    calculateTradeDetails: useCallback(
      (
        marketIndex: number,
        baseAssetAmount: number,
        direction: "long" | "short",
        leverage: number,
        orderType: "market" | "limit" | "takeProfit" | "stopLimit" | "scale",
        limitPrice?: number,
      ) => {
        if (!driftClient || !user) return null;
        try {
          const oracleData =
            driftClient.getOracleDataForPerpMarket(marketIndex);
          const oraclePrice = oracleData.price.toNumber() / 1e6;

          // Entry price - for market orders use oracle, for limit use limit price
          const entryPrice =
            orderType === "market" ? oraclePrice : limitPrice || oraclePrice;

          // Position value (notional)
          const positionValue = baseAssetAmount * entryPrice;

          // Fees (0.1% taker for market, 0% maker for limit)
          const feeRate = orderType === "market" ? 0.001 : 0;
          const estimatedFee = positionValue * feeRate;

          // Required margin (Initial margin requirement ~5% for most markets)
          const marginRate = 0.05; // 5% initial margin = 20x max leverage
          const requiredMargin = positionValue * marginRate;

          // User's collateral
          const freeCollateral = user.getFreeCollateral().toNumber() / 1e6;
          const totalCollateral = user.getTotalCollateral().toNumber() / 1e6;

          // Estimate liquidation price (simplified)
          // Liquidation happens when equity falls below maintenance margin (~3%)
          const maintenanceMarginRate = 0.03;
          const collateralAfterTrade = freeCollateral - requiredMargin;
          let liquidationPrice: number | null = null;

          if (direction === "long") {
            // For longs, liquidation when price drops
            // equity = collateral + unrealizedPnL
            // unrealizedPnL = (currentPrice - entryPrice) * size
            // Liquidation when: collateral + (liqPrice - entryPrice) * size = positionValue * maintenanceMarginRate
            const liqPriceChange =
              (requiredMargin - positionValue * maintenanceMarginRate) /
              baseAssetAmount;
            liquidationPrice = entryPrice - liqPriceChange;
            if (liquidationPrice < 0) liquidationPrice = null;
          } else {
            // For shorts, liquidation when price rises
            const liqPriceChange =
              (requiredMargin - positionValue * maintenanceMarginRate) /
              baseAssetAmount;
            liquidationPrice = entryPrice + liqPriceChange;
          }

          // Price impact estimate for market orders (simplified)
          const priceImpact =
            orderType === "market"
              ? Math.min(baseAssetAmount * 0.0001, 0.005) // Rough estimate
              : 0;

          return {
            entryPrice,
            oraclePrice,
            positionValue,
            estimatedFee,
            feeRate,
            requiredMargin,
            freeCollateral,
            totalCollateral,
            liquidationPrice,
            priceImpact,
            leverage: positionValue / requiredMargin,
            effectiveLeverage: positionValue / (freeCollateral || 1),
            canAfford: freeCollateral >= requiredMargin,
          };
        } catch (err) {
          console.error("Error calculating trade details:", err);
          return null;
        }
      },
      [driftClient, user],
    ),
  };
};

export default useDrift;
