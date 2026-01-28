import { useWallets } from "@privy-io/react-auth/solana";
import {
  DriftClient,
  User,
  getMarketOrderParams,
  PositionDirection,
  BASE_PRECISION,
  BN,
  PerpMarkets,
  SpotMarkets,
  initialize,
  Wallet,
  OrderType,
  MarketType,
  PRICE_PRECISION,
  IWallet,
  loadKeypair,
} from "@drift-labs/sdk";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@drift-labs/sdk/node_modules/@solana/web3.js";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";

// Environment configuration
const DRIFT_ENV = "devnet"; // Change to "mainnet-beta" for production
const RPC_URL =
  DRIFT_ENV === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";

export interface TradeParams {
  marketIndex: number;
  direction: "long" | "short";
  baseAmount: number; // Amount in base asset (e.g., SOL)
  price?: number; // Optional limit price
  reduceOnly?: boolean;
  orderType?: "market" | "limit";
}

export interface SpotTradeParams {
  marketIndex: number;
  direction: "long" | "short";
  amount: number;
  price?: number;
}

export interface DepositParams {
  marketIndex: number; // 0 = USDC
  amount: number;
}

export interface WithdrawParams {
  marketIndex: number;
  amount: number;
}

/**
 * Create a Privy-compatible wallet adapter for Drift SDK
 * This adapts Privy's wallet interface to work with Drift's IWallet interface
 */
const createPrivyWalletAdapter = (
  privyWallet: any,
  chainPrefix: string,
): IWallet => {
  const publicKey = new PublicKey(privyWallet.address);

  return {
    publicKey,
    signTransaction: async (tx: Transaction): Promise<Transaction> => {
      const serialized = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const result = await privyWallet.signTransaction!({
        chain: chainPrefix,
        transaction: new Uint8Array(serialized),
      });

      return Transaction.from(Buffer.from(result.signedTransaction));
    },
    signAllTransactions: async (txs: Transaction[]): Promise<Transaction[]> => {
      const signedTxs: Transaction[] = [];
      for (const tx of txs) {
        const serialized = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        const result = await privyWallet.signTransaction!({
          chain: chainPrefix,
          transaction: new Uint8Array(serialized),
        });

        signedTxs.push(Transaction.from(Buffer.from(result.signedTransaction)));
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
  const connectionRef = useRef<Connection | null>(null);

  // Get the first connected Solana wallet from Privy
  const privyWallet = useMemo(() => {
    // Find the embedded/Privy wallet or just use the first available wallet
    return wallets[0] || null;
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
      setDriftClient(client);
      setIsInitialized(true);

      // Try to get the user account
      try {
        const driftUser = client.getUser();
        setUser(driftUser);
      } catch {
        // User account may not exist yet
        console.log("User account not found - may need to initialize");
      }

      return client;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize Drift";
      setError(errorMessage);
      console.error("Drift initialization error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [privyWallet, connection, sdkConfig, chainPrefix]);

  // Initialize user account if it doesn't exist
  const initializeUserAccount = useCallback(
    async (subAccountId: number = 0, name: string = "Main Account") => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

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
        const driftUser = driftClient.getUser();
        setUser(driftUser);

        return { txSig, userPublicKey };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to initialize user account";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [driftClient],
  );

  // Deposit funds into Drift
  const deposit = useCallback(
    async ({ marketIndex, amount }: DepositParams) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      setIsLoading(true);
      setError(null);

      try {
        const spotMarketPrecision =
          driftClient.getSpotMarketAccount(marketIndex)?.decimals || 6;
        const depositAmount = new BN(amount * 10 ** spotMarketPrecision);

        const associatedTokenAccount =
          await driftClient.getAssociatedTokenAccount(marketIndex);

        const txSig = await driftClient.deposit(
          depositAmount,
          marketIndex,
          associatedTokenAccount,
        );

        console.log("Deposit transaction:", txSig);
        return txSig;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to deposit";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [driftClient],
  );

  // Withdraw funds from Drift
  const withdraw = useCallback(
    async ({ marketIndex, amount }: WithdrawParams) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      setIsLoading(true);
      setError(null);

      try {
        const spotMarketPrecision =
          driftClient.getSpotMarketAccount(marketIndex)?.decimals || 6;
        const withdrawAmount = new BN(amount * 10 ** spotMarketPrecision);

        const associatedTokenAccount =
          await driftClient.getAssociatedTokenAccount(marketIndex);

        const txSig = await driftClient.withdraw(
          withdrawAmount,
          marketIndex,
          associatedTokenAccount,
        );

        console.log("Withdraw transaction:", txSig);
        return txSig;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to withdraw";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [driftClient],
  );

  // Place a perpetual market order
  const placePerpMarketOrder = useCallback(
    async ({
      marketIndex,
      direction,
      baseAmount,
      reduceOnly = false,
    }: TradeParams) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      setIsLoading(true);
      setError(null);

      try {
        const positionDirection =
          direction === "long"
            ? PositionDirection.LONG
            : PositionDirection.SHORT;

        // Convert base amount to proper precision (BASE_PRECISION = 1e9)
        const baseAssetAmount = new BN(baseAmount).mul(BASE_PRECISION);

        const orderParams = getMarketOrderParams({
          marketIndex,
          direction: positionDirection,
          baseAssetAmount,
          reduceOnly,
        });

        const txSig = await driftClient.placePerpOrder(orderParams);
        console.log("Perp market order placed:", txSig);
        return txSig;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to place perp order";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [driftClient],
  );

  // Place a perpetual limit order
  const placePerpLimitOrder = useCallback(
    async ({
      marketIndex,
      direction,
      baseAmount,
      price,
      reduceOnly = false,
    }: TradeParams) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      if (!price) {
        throw new Error("Price is required for limit orders");
      }

      setIsLoading(true);
      setError(null);

      try {
        const positionDirection =
          direction === "long"
            ? PositionDirection.LONG
            : PositionDirection.SHORT;

        const baseAssetAmount = new BN(baseAmount).mul(BASE_PRECISION);
        const limitPrice = new BN(price * PRICE_PRECISION.toNumber());

        const orderParams = {
          orderType: OrderType.LIMIT,
          marketIndex,
          marketType: MarketType.PERP,
          direction: positionDirection,
          baseAssetAmount,
          price: limitPrice,
          reduceOnly,
        };

        const txSig = await driftClient.placePerpOrder(orderParams);
        console.log("Perp limit order placed:", txSig);
        return txSig;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to place perp limit order";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [driftClient],
  );

  // Place a spot order
  const placeSpotOrder = useCallback(
    async ({ marketIndex, direction, amount, price }: SpotTradeParams) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      setIsLoading(true);
      setError(null);

      try {
        const positionDirection =
          direction === "long"
            ? PositionDirection.LONG
            : PositionDirection.SHORT;

        const spotMarket = driftClient.getSpotMarketAccount(marketIndex);
        const precision = spotMarket?.decimals || 9;
        const baseAssetAmount = new BN(amount * 10 ** precision);

        const orderParams: any = {
          orderType: price ? OrderType.LIMIT : OrderType.MARKET,
          marketIndex,
          marketType: MarketType.SPOT,
          direction: positionDirection,
          baseAssetAmount,
        };

        if (price) {
          orderParams.price = new BN(price * PRICE_PRECISION.toNumber());
        }

        const txSig = await driftClient.placeSpotOrder(orderParams);
        console.log("Spot order placed:", txSig);
        return txSig;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to place spot order";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [driftClient],
  );

  // Cancel an order by order ID
  const cancelOrder = useCallback(
    async (orderId: number) => {
      if (!driftClient) {
        throw new Error("Drift client not initialized");
      }

      setIsLoading(true);
      setError(null);

      try {
        const txSig = await driftClient.cancelOrder(orderId);
        console.log("Order cancelled:", txSig);
        return txSig;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to cancel order";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [driftClient],
  );

  // Cancel all orders
  const cancelAllOrders = useCallback(async () => {
    if (!driftClient) {
      throw new Error("Drift client not initialized");
    }

    setIsLoading(true);
    setError(null);

    try {
      const txSig = await driftClient.cancelOrders();
      console.log("All orders cancelled:", txSig);
      return txSig;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel all orders";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [driftClient]);

  // Get user's perp positions
  const getPerpPositions = useCallback(() => {
    if (!user) {
      return [];
    }
    return user.getActivePerpPositions();
  }, [user]);

  // Get user's spot positions
  const getSpotPositions = useCallback(() => {
    if (!user) {
      return [];
    }
    return user.getActiveSpotPositions();
  }, [user]);

  // Get user's open orders
  const getOpenOrders = useCallback(() => {
    if (!user) {
      return [];
    }
    return user.getOpenOrders();
  }, [user]);

  // Get user's unrealized PnL
  const getUnrealizedPnL = useCallback(() => {
    if (!user) {
      return new BN(0);
    }
    return user.getUnrealizedPNL();
  }, [user]);

  // Get user's free collateral
  const getFreeCollateral = useCallback(() => {
    if (!user) {
      return new BN(0);
    }
    return user.getFreeCollateral();
  }, [user]);

  // Get user's leverage
  const getLeverage = useCallback(() => {
    if (!user) {
      return new BN(0);
    }
    return user.getLeverage();
  }, [user]);

  // Get available perp markets
  const getPerpMarkets = useCallback(() => {
    return PerpMarkets[DRIFT_ENV] || [];
  }, []);

  // Get available spot markets
  const getSpotMarkets = useCallback(() => {
    return SpotMarkets[DRIFT_ENV] || [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driftClient) {
        driftClient.unsubscribe();
      }
    };
  }, [driftClient]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    driftClient,
    user,
    privyWallet,

    // Initialization
    initializeDriftClient,
    initializeUserAccount,

    // Trading functions
    placePerpMarketOrder,
    placePerpLimitOrder,
    placeSpotOrder,
    cancelOrder,
    cancelAllOrders,

    // Deposit/Withdraw
    deposit,
    withdraw,

    // Account info
    getPerpPositions,
    getSpotPositions,
    getOpenOrders,
    getUnrealizedPnL,
    getFreeCollateral,
    getLeverage,

    // Market info
    getPerpMarkets,
    getSpotMarkets,
  };
};
