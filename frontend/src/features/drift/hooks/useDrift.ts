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
  SpotMarkets,
} from "@drift-labs/sdk-browser";
import { getAssociatedTokenAddress } from "@solana/spl-token";
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
import { isValidSolanaAddress, createPrivyWalletAdapter } from "@/lib/solana";
import {
  DRIFT_ENV,
  DRIFT_RPC_URL,
  DRIFT_CHAIN_PREFIX,
} from "@/features/drift/constants";

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

  const privyWallet = useMemo(() => {
    const solanaWallet = wallets.find((w) => isValidSolanaAddress(w.address));
    return solanaWallet || null;
  }, [wallets]);

  const connection = useMemo(() => {
    if (!connectionRef.current) {
      connectionRef.current = new Connection(DRIFT_RPC_URL, "confirmed");
    }
    return connectionRef.current;
  }, []);

  const sdkConfig = useMemo(() => initialize({ env: DRIFT_ENV }), []);

  const getTokenAddress = (
    mintAddress: string,
    userPubKey: string,
  ): Promise<PublicKey> => {
    return getAssociatedTokenAddress(
      new PublicKey(mintAddress),
      new PublicKey(userPubKey),
    );
  };

  // Initialize DriftClient with Privy wallet
  const initializeDriftClient = useCallback(async () => {
    if (!privyWallet) {
      setError("No Privy wallet connected");
      return null;
    }

    if (isInitializingRef.current || driftClientRef.current) {
      return driftClientRef.current;
    }

    isInitializingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const wallet = createPrivyWalletAdapter(
        privyWallet,
        DRIFT_CHAIN_PREFIX,
      ) as unknown as IWallet;

      const client = new DriftClient({
        connection,
        wallet,
        env: DRIFT_ENV,
        programID: new PublicKey(sdkConfig.DRIFT_PROGRAM_ID),
      });

      await client.subscribe();

      if (!isMountedRef.current) {
        await client.unsubscribe();
        return null;
      }

      driftClientRef.current = client;
      setDriftClient(client);
      setIsInitialized(true);

      try {
        const driftUser = client.getUser();
        setUser(driftUser);
        setUserAccountExists(true);
      } catch {
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
  }, [privyWallet, connection, sdkConfig]);

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
    async (amount: number, symbol: string, subAccountId: number = 0) => {
      if (!driftClient) throw new Error("Drift client not initialized");
      if (!privyWallet) throw new Error("No wallet connected");
      if (!isMountedRef.current) return null;

      setIsLoading(true);
      setError(null);

      const walletPublicKey = new PublicKey(privyWallet.address);
      const usdcTokenAddress = await getTokenAddress(
        sdkConfig.USDC_MINT_ADDRESS,
        walletPublicKey.toString(),
      );

      try {
        const spotInfo = SpotMarkets[DRIFT_ENV].find(
          (market) => market.symbol === symbol,
        );

        if (!spotInfo) {
          throw new Error(`Spot market for ${symbol} not found`);
        }

        const marketIndex = spotInfo.marketIndex;
        console.log(`Depositing ${symbol} to Market Index ${marketIndex}`);

        const associatedTokenAccount =
          await driftClient.getAssociatedTokenAccount(marketIndex);

        const depositAmount = driftClient.convertToSpotPrecision(
          marketIndex,
          amount,
        );

        let tokenBalance = new BN(0);

        if (symbol === "SOL") {
          const rawBalance = await connection.getBalance(walletPublicKey);
          tokenBalance = new BN(rawBalance);
        }

        if (symbol === "USDC") {
          const tokenAddress = getTokenAddress(
            usdcTokenAddress.toString(),
            walletPublicKey.toString(),
          );
        } else {
          try {
            const tokenAccountInfo = await connection.getTokenAccountBalance(
              associatedTokenAccount,
            );
            tokenBalance = new BN(tokenAccountInfo.value.amount);
          } catch (e) {
            tokenBalance = new BN(0);
          }
        }

        if (depositAmount.gt(tokenBalance)) {
          const readableBalance =
            tokenBalance.toNumber() /
            Math.pow(10, spotInfo.precisionExp.toNumber());
          throw new Error(
            `Insufficient balance. You have ${readableBalance} ${symbol} but need ${amount}`,
          );
        }

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
        if (isMountedRef.current) setError(errorMessage);
        throw err;
      } finally {
        if (isMountedRef.current) setIsLoading(false);
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
      if (!driftClient) throw new Error("Drift client not initialized");
      if (!privyWallet) throw new Error("No wallet connected");
      if (!isMountedRef.current) return null;

      setIsLoading(true);
      setError(null);

      try {
        const withdrawAmount = driftClient.convertToSpotPrecision(
          marketIndex,
          amount,
        );

        const associatedTokenAccount =
          await driftClient.getAssociatedTokenAccount(marketIndex);

        const txSig = await driftClient.withdraw(
          withdrawAmount,
          marketIndex,
          associatedTokenAccount,
          false,
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
          subAccountId = 0,
        } = params;

        const direction = toPositionDirection(uiDirection);
        const orderType = toOrderType(orderVariant);

        // CASE 1: SCALE ORDERS
        if (orderVariant === "scale") {
          if (!startPrice || !endPrice || !orderCount || orderCount < 2) {
            throw new Error(
              "Scale orders require startPrice, endPrice, and orderCount >= 2",
            );
          }

          const orderParamsList: OptionalOrderParams[] = [];
          const step = (endPrice - startPrice) / (orderCount - 1);

          const singleOrderSize = baseAssetAmount / orderCount;
          const baseAmountBN =
            driftClient.convertToPerpPrecision(singleOrderSize);

          for (let i = 0; i < orderCount; i++) {
            const priceLevel = startPrice + step * i;
            const priceBN = driftClient.convertToPricePrecision(priceLevel);

            orderParamsList.push({
              orderType: OrderType.LIMIT,
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

          const orderIxs = await driftClient.getPlaceOrdersIx(
            orderParamsList,
            subAccountId,
          );

          const tx = await driftClient.buildTransaction(orderIxs);

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

        // CASE 2: SINGLE ORDERS
        const baseAmountBN =
          driftClient.convertToPerpPrecision(baseAssetAmount);

        let priceBN: BN | undefined;
        if (orderVariant === "market") {
          priceBN = undefined;
        } else {
          if (uiPrice === undefined)
            throw new Error("Price is required for this order type");
          priceBN = driftClient.convertToPricePrecision(uiPrice);
        }

        let triggerPriceBN: BN | undefined;
        let triggerCondition: OrderTriggerCondition | undefined;

        if (orderVariant === "takeProfit" || orderVariant === "stopLimit") {
          if (uiTriggerPrice === undefined)
            throw new Error("Trigger price is required");
          triggerPriceBN = driftClient.convertToPricePrecision(uiTriggerPrice);
          triggerCondition = getTriggerCondition(orderVariant, uiDirection);
        }

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

        if (priceBN !== undefined) {
          orderParams.price = priceBN;
        }

        if (triggerPriceBN !== undefined) {
          orderParams.triggerPrice = triggerPriceBN;
          orderParams.triggerCondition = triggerCondition;
        }

        const orderIx = await driftClient.getPlacePerpOrderIx(
          orderParams,
          subAccountId,
        );

        const tx = await driftClient.buildTransaction(orderIx);

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
    [driftClient, isInitialized],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (driftClientRef.current) {
        driftClientRef.current.unsubscribe().catch(console.error);
        driftClientRef.current = null;
      }
    };
  }, []);

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

  const getSpotIndex = useCallback((symbol: string): number => {
    const market = SpotMarkets[DRIFT_ENV].find((m) => m.symbol === symbol);
    if (!market) {
      throw new Error(`Spot market ${symbol} not found`);
    }
    return market.marketIndex;
  }, []);

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
    getSpotIndex,

    getFreeCollateral: useCallback(() => {
      if (!user) return null;
      try {
        const freeCollateral = user.getFreeCollateral();
        return freeCollateral.toNumber() / 1e6;
      } catch {
        return null;
      }
    }, [user]),

    getTotalCollateral: useCallback(() => {
      if (!user) return null;
      try {
        const totalCollateral = user.getTotalCollateral();
        return totalCollateral.toNumber() / 1e6;
      } catch {
        return null;
      }
    }, [user]),

    canAffordTrade: useCallback(
      (baseAssetAmount: number, marketIndex: number) => {
        if (!user || !driftClient)
          return { canAfford: false, reason: "Not initialized" };
        try {
          const freeCollateral = user.getFreeCollateral();
          const freeCollateralUsd = freeCollateral.toNumber() / 1e6;
          const oracleData =
            driftClient.getOracleDataForPerpMarket(marketIndex);
          const oraclePrice = oracleData.price.toNumber() / 1e6;
          const positionValue = baseAssetAmount * oraclePrice;
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

    getOraclePrice: useCallback(
      (marketIndex: number): number | null => {
        if (!driftClient) return null;
        try {
          const oracleData =
            driftClient.getOracleDataForPerpMarket(marketIndex);
          return oracleData.price.toNumber() / 1e6;
        } catch {
          return null;
        }
      },
      [driftClient],
    ),

    getPerpMarketInfo: useCallback(
      (marketIndex: number) => {
        if (!driftClient) return null;
        try {
          const market = driftClient.getPerpMarketAccount(marketIndex);
          if (!market) return null;

          const oracleData =
            driftClient.getOracleDataForPerpMarket(marketIndex);
          const oraclePrice = oracleData.price.toNumber() / 1e6;

          const takerFee = 0.001;
          const makerFee = 0;

          const lastFundingRate = market.amm?.lastFundingRate
            ? market.amm.lastFundingRate.toNumber() / 1e9
            : 0;

          const fundingRate8h = lastFundingRate * 8;
          const fundingRateAnnualized = lastFundingRate * 24 * 365;

          const markPrice = market.amm?.lastMarkPriceTwap
            ? market.amm.lastMarkPriceTwap.toNumber() / 1e6
            : oraclePrice;

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

          const entryPrice =
            orderType === "market" ? oraclePrice : limitPrice || oraclePrice;
          const positionValue = baseAssetAmount * entryPrice;

          const feeRate = orderType === "market" ? 0.001 : 0;
          const estimatedFee = positionValue * feeRate;

          const marginRate = 0.05;
          const requiredMargin = positionValue * marginRate;

          const freeCollateral = user.getFreeCollateral().toNumber() / 1e6;
          const totalCollateral = user.getTotalCollateral().toNumber() / 1e6;

          const maintenanceMarginRate = 0.03;
          let liquidationPrice: number | null = null;

          if (direction === "long") {
            const liqPriceChange =
              (requiredMargin - positionValue * maintenanceMarginRate) /
              baseAssetAmount;
            liquidationPrice = entryPrice - liqPriceChange;
            if (liquidationPrice < 0) liquidationPrice = null;
          } else {
            const liqPriceChange =
              (requiredMargin - positionValue * maintenanceMarginRate) /
              baseAssetAmount;
            liquidationPrice = entryPrice + liqPriceChange;
          }

          const priceImpact =
            orderType === "market"
              ? Math.min(baseAssetAmount * 0.0001, 0.005)
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
