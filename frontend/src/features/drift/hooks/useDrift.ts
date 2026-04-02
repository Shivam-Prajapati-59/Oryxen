"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import type { DriftClient, User } from "@drift-labs/sdk-browser";
import {
  BN,
  PositionDirection,
  OrderType,
  MarketType,
} from "@drift-labs/sdk-browser";
import { PublicKey } from "@solana/web3.js";

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

interface EnsureMarginParams {
  requiredMarginUsd: number;
  collateralPriceUsd: number;
  collateralSymbol?: string;
  subAccountId?: number;
  userAccountName?: string;
}

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
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // ─── Refs ──────────────────────────────────────────────────────────
  const isMountedRef = useRef(true);
  const driftClientRef = useRef<DriftClient | null>(null);
  const isInitializingRef = useRef(false);

  // ─── Derived ───────────────────────────────────────────────────────
  const connection = useMemo(() => getDriftConnection(), []);

  const privyWallet = useMemo(() => {
    // Always prefer the Privy embedded wallet over external wallets (Solflare, Phantom, etc.)
    return (
      wallets.find((w) => {
        const name = w.standardWallet?.name?.toLowerCase() ?? "";
        return (
          (name === "privy" || name.includes("privy")) &&
          isValidSolanaAddress(w.address)
        );
      }) ?? null
    );
  }, [wallets]);

  // ─── Helpers ───────────────────────────────────────────────────────
  const safeSet = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
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

  // ─── Wallet Balance (Privy embedded wallet) ─────────────────────────
  const fetchWalletBalance = useCallback(async () => {
    if (!privyWallet || !connection) {
      setWalletBalance(0);
      return;
    }
    try {
      const pubkey = new PublicKey(privyWallet.address);
      const lamports = await connection.getBalance(pubkey);
      const solBalance = lamports / 1e9; // Convert lamports to SOL
      setWalletBalance(solBalance);
    } catch (err) {
      console.warn("[Drift] Failed to fetch wallet balance:", err);
      setWalletBalance(0);
    }
  }, [privyWallet, connection]);

  // Fetch wallet balance on mount and periodically
  useEffect(() => {
    fetchWalletBalance();
    const interval = setInterval(fetchWalletBalance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchWalletBalance]);

  // ─── Close Position with Auto-Withdraw ──────────────────────────────
  const closePosition = useCallback(
    async (marketIndex: number): Promise<TradeResult> => {
      if (!driftClient || !user) {
        throw new Error("Drift client or user not initialized");
      }

      return withLoading(async () => {
        // Get current position
        const position = user.getPerpPosition(marketIndex);
        if (!position || position.baseAssetAmount.isZero()) {
          throw new Error("No position to close");
        }

        // Determine direction to close (opposite of current position)
        const isLong = position.baseAssetAmount.gt(new BN(0));
        const closeDirection = isLong
          ? PositionDirection.SHORT
          : PositionDirection.LONG;
        const baseAmount = position.baseAssetAmount.abs();

        // Place a reduce-only market order to close the position
        const orderParams = {
          orderType: OrderType.MARKET,
          marketIndex,
          marketType: MarketType.PERP,
          direction: closeDirection,
          baseAssetAmount: baseAmount,
          reduceOnly: true,
        };

        const txSig = await driftClient.placePerpOrder(orderParams);
        console.log("[Drift] Close position tx:", txSig);

        // Wait for transaction confirmation instead of hardcoded delay
        try {
          const confirmation = await connection.confirmTransaction(
            txSig,
            "confirmed",
          );
          if (confirmation.value.err) {
            throw new Error(
              `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
            );
          }
          console.log("[Drift] Close position confirmed");
        } catch (confirmErr) {
          console.warn(
            "[Drift] Confirmation polling failed, falling back to delay:",
            confirmErr,
          );
          // Fallback to polling position state with timeout
          const maxWaitMs = 15000;
          const pollIntervalMs = 1000;
          const startTime = Date.now();

          while (Date.now() - startTime < maxWaitMs) {
            await driftClient.fetchAccounts();
            const checkPosition = driftClient
              .getUser()
              .getPerpPosition(marketIndex);
            if (!checkPosition || checkPosition.baseAssetAmount.isZero()) {
              console.log("[Drift] Position closed confirmed via polling");
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          }
        }

        // Refresh user data
        await driftClient.fetchAccounts();
        const refreshedUser = driftClient.getUser();
        safeSet(setUser, refreshedUser);

        // Auto-withdraw any free collateral back to wallet
        const freeCol = refreshedUser.getFreeCollateral();
        const freeColNum = bnToUsd(freeCol);
        if (freeColNum > 0.01) {
          // Withdraw 99% to leave some for fees
          const withdrawAmount = freeColNum * 0.99;
          console.log(
            "[Drift] Auto-withdrawing",
            withdrawAmount,
            "USDC to wallet",
          );
          try {
            await adapterWithdraw(driftClient, withdrawAmount, "USDC", true, 0);
          } catch (withdrawErr) {
            console.warn("[Drift] Auto-withdraw failed:", withdrawErr);
          }
        }

        // Refresh wallet balance after withdraw
        await fetchWalletBalance();

        return {
          txSig,
          explorerUrl: `https://solscan.io/tx/${txSig}`,
        };
      });
    },
    [driftClient, user, withLoading, safeSet, fetchWalletBalance, connection],
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

  const ensureMarginForTrade = useCallback(
    async ({
      requiredMarginUsd,
      collateralPriceUsd,
      collateralSymbol = "SOL",
      subAccountId = 0,
      userAccountName = "Trading Account",
    }: EnsureMarginParams) => {
      if (!driftClient) throw new Error("Drift client not initialized");
      if (!isInitialized) throw new Error("Drift client not fully initialized");
      if (requiredMarginUsd <= 0) return null;
      if (collateralPriceUsd <= 0) {
        throw new Error(`Invalid ${collateralSymbol} price for margin deposit`);
      }

      return withLoading(async () => {
        let driftUser = user ?? driftClient.getUser();
        let accountExists = userAccountExists;

        if (accountExists !== true) {
          try {
            accountExists = await driftUser.exists();
          } catch {
            accountExists = false;
          }

          if (!accountExists) {
            await driftClient.initializeUserAccount(subAccountId, userAccountName);
            safeSet(setUserAccountExists, true);
          } else {
            safeSet(setUserAccountExists, true);
          }
        }

        await driftClient.fetchAccounts();
        driftUser = driftClient.getUser();
        safeSet(setUser, driftUser);

        const freeCollateralUsd = bnToUsd(driftUser.getFreeCollateral());
        const marginShortfallUsd = Math.max(0, requiredMarginUsd - freeCollateralUsd);

        if (marginShortfallUsd <= 0.01) {
          return {
            deposited: false,
            depositAmount: 0,
            freeCollateralUsd,
          };
        }

        const feeBufferUsd = Math.max(1, requiredMarginUsd * 0.01);
        const depositAmount = Number(
          ((marginShortfallUsd + feeBufferUsd) / collateralPriceUsd).toFixed(6),
        );

        if (depositAmount <= 0) {
          return {
            deposited: false,
            depositAmount: 0,
            freeCollateralUsd,
          };
        }

        if (walletBalance < depositAmount) {
          throw new Error(
            `Insufficient wallet balance. Need ${depositAmount.toFixed(4)} ${collateralSymbol} available to fund margin.`,
          );
        }

        const depositResult = await adapterDeposit(
          driftClient,
          depositAmount,
          collateralSymbol,
          subAccountId,
        );

        await driftClient.fetchAccounts();
        driftUser = driftClient.getUser();
        safeSet(setUser, driftUser);
        safeSet(setUserAccountExists, true);
        await fetchWalletBalance();

        return {
          deposited: true,
          depositAmount,
          freeCollateralUsd: bnToUsd(driftUser.getFreeCollateral()),
          txSig: depositResult.txSig,
        };
      });
    },
    [
      driftClient,
      isInitialized,
      user,
      userAccountExists,
      walletBalance,
      withLoading,
      safeSet,
      fetchWalletBalance,
    ],
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
      return allOrders.filter((o) => o.orderId !== 0);
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
      walletBalanceUsd?: number, // Optional: wallet balance in USD for canAfford check
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

        // Position value - this is the total position value (baseAssetAmount is already leveraged)
        const positionValue = baseAssetAmount * entryPrice;

        // Read margin ratio from market account (not hardcoded)
        // This is the protocol-enforced initial margin ratio
        const market = driftClient.getPerpMarketAccount(marketIndex);
        const initialMarginRatio = market
          ? market.marginRatioInitial / 10_000
          : 0.1; // fallback only if market unavailable

        // Required margin is position value × initial margin ratio
        // This is the protocol's minimum - you cannot open a position with less
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
        // Use wallet balance if provided (what user can deposit), otherwise use Drift account balance
        let freeCol = walletBalanceUsd ?? 0;
        let totalCol = 0;
        try {
          if (!walletBalanceUsd) {
            freeCol = bnToUsd(user.getFreeCollateral());
          }
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
    walletBalance,

    // Actions
    initializeDriftClient,
    initializeUserAccount,
    deposit,
    withdraw,
    placeOrder,
    closePosition,
    clearError,
    refreshUser,
    fetchWalletBalance,
    ensureMarginForTrade,

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
