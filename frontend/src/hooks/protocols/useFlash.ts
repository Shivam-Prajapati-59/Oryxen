"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { Connection } from "@solana/web3.js";
import type { PerpetualsClient, PoolConfig } from "flash-sdk";
import { Side } from "flash-sdk";
import {
  createFlashClient,
  isValidSolanaAddress,
  FLASH_CONFIG,
  openPositionWithSwap as adapterOpenPositionWithSwap,
  openPosition as adapterOpenPosition,
  getAvailableTokens,
} from "@/adapters/flash";
import type {
  FlashClientState,
  FlashTradeResult,
  TradeDirection,
} from "@/types/flash";
import { toFlashSide } from "@/types/flash";

export function useFlash() {
  const { wallets } = useWallets();

  const [state, setState] = useState<FlashClientState>({
    client: null,
    poolConfig: null,
    isInitialized: false,
    isLoading: false,
    error: null,
  });

  // Trading state
  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [lastTradeResult, setLastTradeResult] =
    useState<FlashTradeResult | null>(null);

  const clientRef = useRef<PerpetualsClient | null>(null);
  const poolConfigRef = useRef<PoolConfig | null>(null);
  const isInitializingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Find the first connected Solana wallet from Privy
  const privyWallet = useMemo(() => {
    return wallets.find((w) => isValidSolanaAddress(w.address)) ?? null;
  }, [wallets]);

  const initializeClient = useCallback(async () => {
    if (!privyWallet) {
      setState((s) => ({ ...s, error: "No Solana wallet connected" }));
      return null;
    }

    // Prevent duplicate initializations
    if (isInitializingRef.current || clientRef.current) {
      return clientRef.current;
    }

    isInitializingRef.current = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // 1. Create the Flash client, pool config, and connection
      const { client, poolConfig } = createFlashClient(
        privyWallet,
        FLASH_CONFIG,
      );

      // 2. Load the Address Lookup Tables (required for composable txs)
      await client.loadAddressLookupTable(poolConfig);

      // 3. Store refs
      clientRef.current = client;
      poolConfigRef.current = poolConfig;

      if (isMountedRef.current) {
        setState({
          client,
          poolConfig,
          isInitialized: true,
          isLoading: false,
          error: null,
        });
      }

      console.log(
        `[useFlash] Initialized on ${FLASH_CONFIG.cluster} — pool: ${FLASH_CONFIG.poolName}`,
      );

      return client;
    } catch (err: any) {
      const message = err?.message ?? "Failed to initialize Flash client";
      console.error("[useFlash] Initialization error:", err);

      if (isMountedRef.current) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: message,
        }));
      }

      isInitializingRef.current = false;
      return null;
    }
  }, [privyWallet]);

  const openPosition = useCallback(
    async (params: {
      inputTokenSymbol: string;
      targetTokenSymbol: string;
      inputAmount: string;
      direction: TradeDirection;
      leverage?: number;
      slippageBps?: number;
    }): Promise<FlashTradeResult> => {
      const client = clientRef.current;
      const poolConfig = poolConfigRef.current;

      if (!client || !poolConfig) {
        const result: FlashTradeResult = {
          success: false,
          error: "Flash client not initialized. Call initialize() first.",
        };
        setLastTradeResult(result);
        return result;
      }

      setIsTrading(true);
      setTradeError(null);

      try {
        const side = toFlashSide(params.direction);

        let txSignature: string;

        // Use openPosition when input and target tokens are the same,
        // otherwise use openPositionWithSwap for different collateral
        if (params.inputTokenSymbol === params.targetTokenSymbol) {
          // Same collateral - use openPosition
          txSignature = await adapterOpenPosition(
            client,
            poolConfig,
            params.targetTokenSymbol,
            params.inputTokenSymbol,
            params.inputAmount,
            side,
            params.leverage,
            params.slippageBps,
          );
        } else {
          // Different collateral - use swap and open
          txSignature = await adapterOpenPositionWithSwap(
            client,
            poolConfig,
            params.inputTokenSymbol,
            params.targetTokenSymbol,
            params.inputAmount,
            side,
            params.leverage,
            params.slippageBps,
          );
        }

        const result: FlashTradeResult = {
          success: true,
          txSignature,
        };

        setLastTradeResult(result);
        setIsTrading(false);
        return result;
      } catch (err: any) {
        const message = err?.message ?? "Failed to open position";
        console.error("[useFlash] openPosition error:", err);

        const result: FlashTradeResult = {
          success: false,
          error: message,
        };

        setTradeError(message);
        setLastTradeResult(result);
        setIsTrading(false);
        return result;
      }
    },
    [],
  );

  /**
   * Disconnect / cleanup the Flash client.
   */
  const disconnect = useCallback(() => {
    clientRef.current = null;
    poolConfigRef.current = null;
    isInitializingRef.current = false;

    setState({
      client: null,
      poolConfig: null,
      isInitialized: false,
      isLoading: false,
      error: null,
    });
    setIsTrading(false);
    setTradeError(null);
    setLastTradeResult(null);
  }, []);

  /**
   * Get tokens available in the current pool config.
   */
  const getPoolTokens = useCallback(() => {
    if (!poolConfigRef.current) return [];
    return getAvailableTokens(poolConfigRef.current);
  }, []);

  /**
   * Get market configs available in the current pool.
   */
  const getMarkets = useCallback(() => {
    return poolConfigRef.current?.markets ?? [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    // Actions
    initialize: initializeClient,
    disconnect,
    openPosition,

    // Pool info
    getPoolTokens,
    getMarkets,

    // Initialization state
    client: state.client,
    poolConfig: state.poolConfig,
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,

    // Trading state
    isTrading,
    tradeError,
    lastTradeResult,

    // Extra
    privyWallet,
    config: FLASH_CONFIG,
  };
}
