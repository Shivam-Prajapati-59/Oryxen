"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import type { PerpetualsClient, PoolConfig } from "flash-sdk";
import {
  createFlashClient,
  openPositionWithSwap as adapterOpenPositionWithSwap,
  openPosition as adapterOpenPosition,
  getAvailableTokens,
} from "../adapter/flash-client";
import { FLASH_CONFIG } from "../constants";
import type {
  FlashClientState,
  FlashTradeResult,
  TradeDirection,
} from "../types";
import { toFlashSide } from "../types";
import { isValidSolanaAddress } from "@/lib/solana";

export function useFlash() {
  const { wallets } = useWallets();

  const [state, setState] = useState<FlashClientState>({
    client: null,
    poolConfig: null,
    isInitialized: false,
    isLoading: false,
    error: null,
  });

  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [lastTradeResult, setLastTradeResult] =
    useState<FlashTradeResult | null>(null);

  const clientRef = useRef<PerpetualsClient | null>(null);
  const poolConfigRef = useRef<PoolConfig | null>(null);
  const isInitializingRef = useRef(false);
  const isMountedRef = useRef(true);

  const privyWallet = useMemo(() => {
    return wallets.find((w) => isValidSolanaAddress(w.address)) ?? null;
  }, [wallets]);

  const initializeClient = useCallback(async () => {
    if (!privyWallet) {
      setState((s) => ({ ...s, error: "No Solana wallet connected" }));
      return null;
    }

    if (isInitializingRef.current || clientRef.current) {
      return clientRef.current;
    }

    isInitializingRef.current = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const { client, poolConfig } = createFlashClient(
        privyWallet,
        FLASH_CONFIG,
      );

      await client.loadAddressLookupTable(poolConfig);

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

        if (params.inputTokenSymbol === params.targetTokenSymbol) {
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

  const getPoolTokens = useCallback(() => {
    if (!poolConfigRef.current) return [];
    return getAvailableTokens(poolConfigRef.current);
  }, []);

  const getMarkets = useCallback(() => {
    return poolConfigRef.current?.markets ?? [];
  }, []);

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
