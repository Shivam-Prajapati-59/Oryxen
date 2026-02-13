"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import type { DriftClient, User } from "@drift-labs/sdk-browser";

import { isValidSolanaAddress } from "@/lib/solana";
import { createDriftClient, getDriftConnection } from "../adapter/client";
import {
  deposit as adapterDeposit,
  withdraw as adapterWithdraw,
} from "../adapter/collateral";
import { placeOrder as adapterPlaceOrder } from "../adapter/orders";
import {
  getOraclePrice as adapterGetOraclePrice,
  getPerpMarketInfo as adapterGetPerpMarketInfo,
} from "../adapter/market-data";
import {
  getAccountSummary,
  getActivePositions as adapterGetActivePositions,
  getSpotBalances as adapterGetSpotBalances,
  canAffordTrade as adapterCanAffordTrade,
} from "../adapter/positions";
import { bnToUsd, bnToPrice, normaliseDriftError } from "../adapter/utils";
import type {
  ExecuteTradeParams,
  TradeResult,
  OrderVariant,
  TradeDirection,
} from "../types";

export const useDrift = () => {
  const { wallets } = useWallets();

  // ─── State ─────────────────────────────────────────────────────────
  const [driftClient, setDriftClient] = useState<DriftClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userAccountExists, setUserAccountExists] = useState<boolean | null>(
    null,
  );

  // ─── Refs ──────────────────────────────────────────────────────────
  const isMountedRef = useRef(true);
  const driftClientRef = useRef<DriftClient | null>(null);
  const isInitializingRef = useRef(false);

  // ─── Derived ───────────────────────────────────────────────────────
  const connection = useMemo(() => getDriftConnection(), []);

  const privyWallet = useMemo(() => {
    return wallets.find((w) => isValidSolanaAddress(w.address)) ?? null;
  }, [wallets]);

  // ─── Helpers ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeSet = useCallback(
    (setter: React.Dispatch<React.SetStateAction<any>>, value: unknown) => {
      if (isMountedRef.current) setter(value);
    },
    [],
  );

  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      safeSet(setIsLoading, true);
      safeSet(setError, null);
      try {
        return await fn();
      } catch (err) {
        const msg = normaliseDriftError(err);
        safeSet(setError, msg);
        throw new Error(msg);
      } finally {
        safeSet(setIsLoading, false);
      }
    },
    [safeSet],
  );

  // ─── Initialize ────────────────────────────────────────────────────
  const initializeDriftClient = useCallback(async () => {
    if (!privyWallet) {
      setError("No Privy wallet connected");
      return null;
    }
    if (isInitializingRef.current || driftClientRef.current) {
      return driftClientRef.current;
    }

    isInitializingRef.current = true;
    safeSet(setIsLoading, true);
    safeSet(setError, null);

    try {
      const client = await createDriftClient(privyWallet);

      if (!isMountedRef.current) {
        await client.unsubscribe();
        return null;
      }

      driftClientRef.current = client;
      setDriftClient(client);
      setIsInitialized(true);

      // Check whether user account exists (SDK-recommended approach)
      try {
        const driftUser = client.getUser();
        const exists = await driftUser.exists();
        setUser(driftUser);
        setUserAccountExists(exists);
      } catch {
        setUserAccountExists(false);
      }

      return client;
    } catch (err) {
      const msg = normaliseDriftError(err);
      safeSet(setError, msg);
      return null;
    } finally {
      isInitializingRef.current = false;
      safeSet(setIsLoading, false);
    }
  }, [privyWallet, safeSet]);

  // ─── User Account ──────────────────────────────────────────────────
  const initializeUserAccount = useCallback(
    async (subAccountId = 0, name = "Main Account") => {
      if (!driftClient) throw new Error("Drift client not initialized");

      return withLoading(async () => {
        const [txSig, userPublicKey] = await driftClient.initializeUserAccount(
          subAccountId,
          name,
        );

        const driftUser = driftClient.getUser();
        safeSet(setUser, driftUser);
        safeSet(setUserAccountExists, true);

        return { txSig, userPublicKey };
      });
    },
    [driftClient, withLoading, safeSet],
  );

  // ─── Deposit / Withdraw ────────────────────────────────────────────
  const deposit = useCallback(
    (amount: number, symbol: string, subAccountId = 0) => {
      if (!driftClient) throw new Error("Drift client not initialized");
      return withLoading(() =>
        adapterDeposit(driftClient, amount, symbol, subAccountId),
      );
    },
    [driftClient, withLoading],
  );

  const withdraw = useCallback(
    (amount: number, symbol: string, reduceOnly = false, subAccountId = 0) => {
      if (!driftClient) throw new Error("Drift client not initialized");
      return withLoading(() =>
        adapterWithdraw(driftClient, amount, symbol, reduceOnly, subAccountId),
      );
    },
    [driftClient, withLoading],
  );

  // ─── Orders ────────────────────────────────────────────────────────
  const placeOrder = useCallback(
    (params: ExecuteTradeParams): Promise<TradeResult> => {
      if (!driftClient) throw new Error("Drift client not initialized");
      if (!isInitialized) throw new Error("Drift client not fully initialized");
      return withLoading(() => adapterPlaceOrder(driftClient, params));
    },
    [driftClient, isInitialized, withLoading],
  );

  // ─── Market data ──────────────────────────────────────────────────
  const getOraclePrice = useCallback(
    (marketIndex: number) => {
      if (!driftClient) return null;
      try {
        return adapterGetOraclePrice(driftClient, marketIndex);
      } catch {
        return null;
      }
    },
    [driftClient],
  );

  const getPerpMarketInfo = useCallback(
    (marketIndex: number) => {
      if (!driftClient) return null;
      try {
        return adapterGetPerpMarketInfo(driftClient, marketIndex);
      } catch {
        return null;
      }
    },
    [driftClient],
  );

  // ─── Account data ─────────────────────────────────────────────────
  const getFreeCollateral = useCallback(() => {
    if (!user) return null;
    try {
      return bnToUsd(user.getFreeCollateral());
    } catch {
      return null;
    }
  }, [user]);

  const getTotalCollateral = useCallback(() => {
    if (!user) return null;
    try {
      return bnToUsd(user.getTotalCollateral());
    } catch {
      return null;
    }
  }, [user]);

  const canAffordTrade = useCallback(
    (baseAssetAmount: number, marketIndex: number) => {
      if (!user || !driftClient)
        return {
          canAfford: false,
          reason: "Not initialized",
          freeCollateral: 0,
        };
      try {
        return adapterCanAffordTrade(
          driftClient,
          user,
          baseAssetAmount,
          marketIndex,
        );
      } catch {
        return {
          canAfford: false,
          reason: "Could not calculate margin",
          freeCollateral: 0,
        };
      }
    },
    [user, driftClient],
  );

  const getAccount = useCallback(() => {
    if (!driftClient || !user) return null;
    try {
      return getAccountSummary(driftClient, user);
    } catch {
      return null;
    }
  }, [driftClient, user]);

  const getPositions = useCallback(() => {
    if (!driftClient || !user) return [];
    try {
      return adapterGetActivePositions(driftClient, user);
    } catch {
      return [];
    }
  }, [driftClient, user]);

  const getSpotBalancesData = useCallback(() => {
    if (!driftClient || !user) return [];
    try {
      return adapterGetSpotBalances(driftClient, user);
    } catch {
      return [];
    }
  }, [driftClient, user]);

  /**
   * Get ALL orders from UserAccount (open + filled + cancelled).
   * The on-chain account has 32 order slots. Slots with orderId === 0 are empty.
   */
  const getAllOrders = useCallback(() => {
    if (!user) return [];
    try {
      const userAccount = user.getUserAccount();
      const allOrders = userAccount.orders ?? [];
      return allOrders.filter((o: any) => o.orderId !== 0);
    } catch {
      return [];
    }
  }, [user]);
  // ─── Trade details (pre-trade estimate, no hardcoded values) ────────
  const calculateTradeDetails = useCallback(
    (
      marketIndex: number,
      baseAssetAmount: number,
      direction: TradeDirection,
      leverage: number,
      orderVariant: OrderVariant,
      limitPrice?: number,
    ) => {
      const zeroResult = (lev: number) => ({
        entryPrice: 0,
        positionValue: 0,
        requiredMargin: 0,
        estimatedFee: 0,
        feeRate: 0,
        liquidationPrice: null as number | null,
        effectiveLeverage: lev,
        freeCollateral: 0,
        canAfford: false,
        priceImpact: 0,
      });

      if (!driftClient || !user) {
        return zeroResult(leverage);
      }

      try {
        // Oracle price (or user-supplied limit price)
        const oracleData = driftClient.getOracleDataForPerpMarket(marketIndex);
        if (!oracleData?.price) {
          console.warn("[Drift] No oracle data for market", marketIndex);
          return zeroResult(leverage);
        }
        const oraclePrice = bnToPrice(oracleData.price);
        const entryPrice = limitPrice ?? oraclePrice;

        // Position value
        const positionValue = baseAssetAmount * entryPrice;

        // Read margin ratio from market account (not hardcoded)
        const market = driftClient.getPerpMarketAccount(marketIndex);
        const initialMarginRatio = market
          ? market.marginRatioInitial / 10_000
          : 0.1; // fallback only if market unavailable
        const requiredMargin = positionValue * initialMarginRatio;

        // Fee from state account's fee structure (avoids User.getUserFeeTier
        // which requires an internal driftClient ref that may not be wired)
        let feeRate = 0;
        try {
          const stateAccount = driftClient.getStateAccount();
          const feeTier = stateAccount.perpFeeStructure.feeTiers[0]; // default tier
          const isTaker =
            orderVariant === "market" ||
            orderVariant === "takeProfit" ||
            orderVariant === "stopLimit";
          if (isTaker) {
            feeRate =
              feeTier.feeDenominator > 0
                ? feeTier.feeNumerator / feeTier.feeDenominator
                : 0.001;
          } else {
            feeRate =
              feeTier.makerRebateDenominator > 0
                ? feeTier.makerRebateNumerator / feeTier.makerRebateDenominator
                : 0;
          }
        } catch (feeErr) {
          console.warn("[Drift] Fee tier read failed, using defaults:", feeErr);
          feeRate = orderVariant === "market" ? 0.001 : 0;
        }
        const estimatedFee = positionValue * Math.abs(feeRate);

        // Free collateral & affordability
        let freeCol = 0;
        let totalCol = 0;
        try {
          freeCol = bnToUsd(user.getFreeCollateral());
          totalCol = bnToUsd(user.getTotalCollateral());
        } catch (colErr) {
          console.warn("[Drift] Collateral read failed:", colErr);
        }
        const canAfford = freeCol >= requiredMargin;

        // Effective leverage
        let effectiveLeverage = leverage;
        try {
          if (totalCol > 0) {
            const hasPositions = user.getActivePerpPositions().length > 0;
            effectiveLeverage =
              (positionValue + totalCol * (hasPositions ? 1 : 0)) / totalCol;
          }
        } catch {
          // keep input leverage as fallback
        }

        return {
          entryPrice,
          positionValue,
          requiredMargin,
          estimatedFee,
          feeRate,
          liquidationPrice: null as number | null, // available post-trade via getAccount()
          effectiveLeverage,
          freeCollateral: freeCol,
          canAfford,
          priceImpact: 0, // no fake estimate — real impact requires on-chain simulation
        };
      } catch (err) {
        console.error("[Drift] calculateTradeDetails failed:", err);
        return zeroResult(leverage);
      }
    },
    [driftClient, user],
  );

  // ─── Refresh ───────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (!driftClient || !isMountedRef.current) return;
    try {
      await driftClient.fetchAccounts();
      safeSet(setUser, driftClient.getUser());
    } catch (err) {
      console.error("Error refreshing user:", err);
    }
  }, [driftClient, safeSet]);

  const clearError = useCallback(() => setError(null), []);

  // ─── Lifecycle ─────────────────────────────────────────────────────
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

  // ─── Return ────────────────────────────────────────────────────────
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

    // Queries (no hardcoded values)
    getOraclePrice,
    getPerpMarketInfo,
    getFreeCollateral,
    getTotalCollateral,
    canAffordTrade,
    getAccount,
    getPositions,
    getSpotBalances: getSpotBalancesData,
    getAllOrders,
    calculateTradeDetails,
  };
};

export default useDrift;
