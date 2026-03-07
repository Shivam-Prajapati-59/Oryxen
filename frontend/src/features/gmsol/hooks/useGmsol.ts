/**
 * useGmsol — React hook for GMSOL trading via the @gmsol-labs/gmsol-sdk.
 *
 * All transaction building uses SDK functions directly (create_orders,
 * close_orders, update_orders, create_deposits, create_withdrawals,
 * create_shifts) following the exact same patterns as the official SDK demo.
 *
 * Data fetching (markets, positions, orders) uses Anchor program.account.
 */

import { isValidSolanaAddress, createPrivyWalletAdapter } from "@/lib/solana";
import { useWallets } from "@privy-io/react-auth/solana";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MarketInfo,
  CreateOrderFormData,
  CreateDepositFormData,
  CreateWithdrawalFormData,
  CreateShiftFormData,
} from "../types";
import { listMarkets } from "../adapter/list-markets";
import { listPositions, PositionInfo } from "../adapter/list-positions";
import { listOrders, OrderInfo } from "../adapter/list-orders";

// SDK adapter imports — each calls the SDK function directly
import {
  buildCreateOrder,
  buildCreateOrderWithTPSL,
  buildCloseOrders,
  buildUpdateOrders,
} from "../adapter/order";
import { buildCreateDeposits } from "../adapter/deposit";
import { buildCreateWithdrawals } from "../adapter/withdrawal";
import { buildCreateShifts } from "../adapter/shift";

import type {
  CreateOrderHint,
  CloseOrderHint,
  UpdateParams,
  UpdateOrderParams,
} from "@gmsol-labs/gmsol-sdk";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { IDL } from "@/lib/idl/gmsol/gmsol-store-idl";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";
import { GMSOL_RPC_URL, GMSOL_CHAIN_PREFIX } from "../constants";

export const useGmsol = () => {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [txSignatures, setTxSignatures] = useState<string[]>([]);

  // ── Privy Solana wallet ────────────────────────────────────────────
  const privyWallet = useMemo(
    () => wallets.find((w) => isValidSolanaAddress(w.address)) ?? null,
    [wallets],
  );

  const connection = useMemo(
    () => new Connection(GMSOL_RPC_URL, "processed"),
    [],
  );

  const program = useMemo(() => {
    const provider = privyWallet
      ? new AnchorProvider(
          connection,
          createPrivyWalletAdapter(privyWallet, GMSOL_CHAIN_PREFIX) as any,
          { commitment: "processed", skipPreflight: true },
        )
      : new AnchorProvider(
          connection,
          {
            publicKey: PublicKey.default,
            signTransaction: async () => {
              throw new Error("Wallet not connected");
            },
            signAllTransactions: async () => {
              throw new Error("Wallet not connected");
            },
          } as any,
          { commitment: "processed", skipPreflight: true },
        );

    return new Program<GmsolStore>(IDL as any, provider);
  }, [privyWallet, connection]);

  // ── Fetch markets ──────────────────────────────────────────────────
  const fetchMarkets = useCallback(async () => {
    if (!program) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listMarkets(program);
      setMarkets(data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setIsLoading(false);
    }
  }, [program]);

  // ── Fetch user positions and orders ──────────────────────────────
  const fetchPositionsAndOrders = useCallback(async () => {
    if (!program || !privyWallet) return;
    try {
      const ownerPublicKey = new PublicKey(privyWallet.address);
      const [fetchedPositions, fetchedOrders] = await Promise.all([
        listPositions(program, ownerPublicKey),
        listOrders(program, ownerPublicKey),
      ]);
      setPositions(fetchedPositions);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Failed to fetch positions and orders", err);
    }
  }, [program, privyWallet]);

  useEffect(() => {
    fetchMarkets();
    fetchPositionsAndOrders();
  }, [fetchMarkets, fetchPositionsAndOrders]);

  // ── Helper: sign & send SDK-generated transactions ─────────────────
  const signAndSendTransactions = useCallback(
    async (serializedTxns: Uint8Array[]): Promise<string[]> => {
      if (!privyWallet) throw new Error("Wallet not connected");

      const adapter = createPrivyWalletAdapter(privyWallet, GMSOL_CHAIN_PREFIX);
      const signatures: string[] = [];

      for (const txnBytes of serializedTxns) {
        const tx = VersionedTransaction.deserialize(txnBytes);
        const signed = await adapter.signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: true,
        });
        signatures.push(sig);
      }

      return signatures;
    },
    [privyWallet, connection],
  );

  // ══════════════════════════════════════════════════════════════════
  //  ORDER OPERATIONS — uses SDK create_orders / create_orders_builder
  // ══════════════════════════════════════════════════════════════════

  const submitOrder = useCallback(
    async (formData: CreateOrderFormData) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxSignatures([]);

      try {
        const { blockhash } = await connection.getLatestBlockhash();
        const payer = privyWallet.address;

        // Hints map — same as demo
        const hints = new Map<string, CreateOrderHint>([
          [
            formData.marketToken,
            {
              long_token: formData.longToken,
              short_token: formData.shortToken,
            },
          ],
        ]);

        // Base options — same structure as demo
        const baseOptions = {
          recent_blockhash: blockhash,
          payer,
          collateral_or_swap_out_token: formData.collateralToken,
          compute_unit_price_micro_lamports: 2_000_000,
          hints,
          transaction_group: {} as any,
        };

        // Order params — same as demo
        const orderParams = {
          market_token: formData.marketToken,
          is_long: formData.isLong,
          size: BigInt(formData.sizeDeltaUsd),
          amount: BigInt(formData.amount),
          trigger_price: formData.triggerPrice
            ? BigInt(formData.triggerPrice)
            : undefined,
        };

        let serializedTxns: Uint8Array[];

        // If TP or SL prices are set, use the builder + merge pattern (exactly like demo)
        if (formData.takeProfitPrice || formData.stopLossPrice) {
          const tpParams = formData.takeProfitPrice
            ? {
                kind: "LimitDecrease" as const,
                params: [
                  {
                    market_token: formData.marketToken,
                    is_long: formData.isLong,
                    size: BigInt(formData.sizeDeltaUsd),
                    amount: BigInt(formData.amount),
                    trigger_price: BigInt(formData.takeProfitPrice),
                  },
                ],
                options: { ...baseOptions },
              }
            : undefined;

          const slParams = formData.stopLossPrice
            ? {
                kind: "StopLossDecrease" as const,
                params: [
                  {
                    market_token: formData.marketToken,
                    is_long: formData.isLong,
                    size: BigInt(formData.sizeDeltaUsd),
                    amount: BigInt(formData.amount),
                    trigger_price: BigInt(formData.stopLossPrice),
                  },
                ],
                options: { ...baseOptions },
              }
            : undefined;

          serializedTxns = await buildCreateOrderWithTPSL(
            formData.orderKind,
            [orderParams],
            baseOptions,
            tpParams,
            slParams,
            {
              recent_blockhash: blockhash,
              compute_unit_price_micro_lamports: 2_000_000,
            },
          );
        } else {
          // Simple single order — same as demo create_orders call
          serializedTxns = await buildCreateOrder(
            formData.orderKind,
            [orderParams],
            baseOptions,
          );
        }

        const sigs = await signAndSendTransactions(serializedTxns);
        setTxSignatures(sigs);
        console.log("Order transactions sent:", sigs);

        await fetchPositionsAndOrders();
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to create order");
      } finally {
        setIsLoading(false);
      }
    },
    [privyWallet, connection, signAndSendTransactions, fetchPositionsAndOrders],
  );

  // ══════════════════════════════════════════════════════════════════
  //  CLOSE ORDER — uses SDK close_orders (same Map pattern as demo)
  // ══════════════════════════════════════════════════════════════════

  const submitCloseOrder = useCallback(
    async (orderAddress: string) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxSignatures([]);

      try {
        const orderInfo = orders.find((o) => o.address === orderAddress);
        if (!orderInfo) throw new Error("Order not found in local state");

        const { blockhash } = await connection.getLatestBlockhash();
        const payer = privyWallet.address;

        // Build the orders Map exactly like the demo
        const ordersMap = new Map<string, CloseOrderHint>([
          [
            orderAddress,
            {
              owner: payer,
              receiver: payer,
              rent_receiver: payer,
              referrer: undefined,
              initial_collateral_token:
                orderInfo.initialCollateralToken || undefined,
              final_output_token: orderInfo.finalOutputToken || undefined,
              long_token: orderInfo.longToken,
              short_token: orderInfo.shortToken,
              should_unwrap_native_token: true,
              callback: undefined,
            },
          ],
        ]);

        const serializedTxns = await buildCloseOrders({
          recent_blockhash: blockhash,
          payer,
          orders: ordersMap,
        });

        const sigs = await signAndSendTransactions(serializedTxns);
        setTxSignatures(sigs);
        console.log("Close order transactions sent:", sigs);

        await fetchPositionsAndOrders();
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to close order");
      } finally {
        setIsLoading(false);
      }
    },
    [
      privyWallet,
      connection,
      orders,
      signAndSendTransactions,
      fetchPositionsAndOrders,
    ],
  );

  // ══════════════════════════════════════════════════════════════════
  //  UPDATE ORDER — uses SDK update_orders (same Map pattern as demo)
  // ══════════════════════════════════════════════════════════════════

  const submitUpdateOrder = useCallback(
    async (
      orderAddress: string,
      updates: { sizeDeltaValue?: string; triggerPrice?: string },
    ) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxSignatures([]);

      try {
        const orderInfo = orders.find((o) => o.address === orderAddress);
        if (!orderInfo) throw new Error("Order not found in local state");

        const { blockhash } = await connection.getLatestBlockhash();
        const payer = privyWallet.address;

        // Build update params exactly like the demo
        const params: UpdateOrderParams = {};
        if (updates.sizeDeltaValue)
          params.size_delta_value = BigInt(updates.sizeDeltaValue);
        if (updates.triggerPrice)
          params.trigger_price = BigInt(updates.triggerPrice);

        const ordersMap = new Map<string, UpdateParams>([
          [
            orderAddress,
            {
              params,
              hint: {
                market_token: orderInfo.marketToken,
                callback: undefined,
              },
            },
          ],
        ]);

        const serializedTxns = await buildUpdateOrders({
          recent_blockhash: blockhash,
          payer,
          orders: ordersMap,
        });

        const sigs = await signAndSendTransactions(serializedTxns);
        setTxSignatures(sigs);
        console.log("Update order transactions sent:", sigs);

        await fetchPositionsAndOrders();
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to update order");
      } finally {
        setIsLoading(false);
      }
    },
    [
      privyWallet,
      connection,
      orders,
      signAndSendTransactions,
      fetchPositionsAndOrders,
    ],
  );

  // ══════════════════════════════════════════════════════════════════
  //  DEPOSIT — uses SDK create_deposits (same pattern as demo)
  // ══════════════════════════════════════════════════════════════════

  const submitDeposit = useCallback(
    async (formData: CreateDepositFormData) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxSignatures([]);

      try {
        const { blockhash } = await connection.getLatestBlockhash();
        const payer = privyWallet.address;

        // Deposit params — same structure as demo
        const depositParams = {
          market_token: formData.marketToken,
          receiver: payer,
          long_pay_token: formData.longPayToken,
          short_pay_token: formData.shortPayToken,
          long_swap_path: [] as string[],
          short_swap_path: [] as string[],
          long_pay_amount: BigInt(formData.longPayAmount || "0"),
          short_pay_amount: BigInt(formData.shortPayAmount || "0"),
          min_receive_amount: BigInt(formData.minReceiveAmount || "0"),
          unwrap_native_on_receive: true,
        };

        // Hints map — same as demo
        const hints = new Map([
          [
            formData.marketToken,
            {
              pool_tokens: {
                long_token: formData.longToken,
                short_token: formData.shortToken,
              },
            },
          ],
        ]);

        const serializedTxns = await buildCreateDeposits([depositParams], {
          recent_blockhash: blockhash,
          payer,
          hints,
          transaction_group: {},
        });

        const sigs = await signAndSendTransactions(serializedTxns);
        setTxSignatures(sigs);
        console.log("Deposit transactions sent:", sigs);
      } catch (err: unknown) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to create deposit",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [privyWallet, connection, signAndSendTransactions],
  );

  // ══════════════════════════════════════════════════════════════════
  //  WITHDRAWAL — uses SDK create_withdrawals (same pattern as demo)
  // ══════════════════════════════════════════════════════════════════

  const submitWithdrawal = useCallback(
    async (formData: CreateWithdrawalFormData) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxSignatures([]);

      try {
        const { blockhash } = await connection.getLatestBlockhash();
        const payer = privyWallet.address;

        // Withdrawal params — same structure as demo
        const withdrawalParams = {
          market_token: formData.marketToken,
          market_token_amount: BigInt(formData.marketTokenAmount),
        };

        // Hints map — same as demo
        const hints = new Map([
          [
            formData.marketToken,
            {
              pool_tokens: {
                long_token: formData.longToken,
                short_token: formData.shortToken,
              },
            },
          ],
        ]);

        const serializedTxns = await buildCreateWithdrawals(
          [withdrawalParams],
          {
            recent_blockhash: blockhash,
            payer,
            hints,
            transaction_group: {},
          },
        );

        const sigs = await signAndSendTransactions(serializedTxns);
        setTxSignatures(sigs);
        console.log("Withdrawal transactions sent:", sigs);
      } catch (err: unknown) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to create withdrawal",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [privyWallet, connection, signAndSendTransactions],
  );

  // ══════════════════════════════════════════════════════════════════
  //  SHIFT — uses SDK create_shifts (same pattern as demo)
  // ══════════════════════════════════════════════════════════════════

  const submitShift = useCallback(
    async (formData: CreateShiftFormData) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxSignatures([]);

      try {
        const { blockhash } = await connection.getLatestBlockhash();
        const payer = privyWallet.address;

        // Shift params — same structure as demo
        const shiftParams = {
          from_market_token: formData.fromMarketToken,
          to_market_token: formData.toMarketToken,
          from_market_token_amount: BigInt(formData.fromMarketTokenAmount),
        };

        const serializedTxns = await buildCreateShifts([shiftParams], {
          recent_blockhash: blockhash,
          payer,
          transaction_group: {},
        });

        const sigs = await signAndSendTransactions(serializedTxns);
        setTxSignatures(sigs);
        console.log("Shift transactions sent:", sigs);
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to create shift");
      } finally {
        setIsLoading(false);
      }
    },
    [privyWallet, connection, signAndSendTransactions],
  );

  // ══════════════════════════════════════════════════════════════════
  //  CLOSE POSITION — creates a MarketDecrease order for full position size
  // ══════════════════════════════════════════════════════════════════

  const submitClosePosition = useCallback(
    async (positionInfo: PositionInfo) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxSignatures([]);

      try {
        const { blockhash } = await connection.getLatestBlockhash();
        const payer = privyWallet.address;

        // Find market to get long/short tokens
        const market = markets.find(
          (m) => m.marketTokenMint === positionInfo.marketToken,
        );
        if (!market)
          throw new Error(
            "Market not found for position. Refresh markets first.",
          );

        // Hints map
        const hints = new Map<string, CreateOrderHint>([
          [
            positionInfo.marketToken,
            {
              long_token: market.longToken,
              short_token: market.shortToken,
            },
          ],
        ]);

        // Create MarketDecrease order for full position size
        const orderParams = {
          market_token: positionInfo.marketToken,
          is_long: positionInfo.side === "long",
          size: BigInt(positionInfo.sizeInUsd),
          amount: BigInt(0), // receive all collateral back
        };

        const serializedTxns = await buildCreateOrder(
          "MarketDecrease",
          [orderParams],
          {
            recent_blockhash: blockhash,
            payer,
            collateral_or_swap_out_token: positionInfo.collateralToken,
            compute_unit_price_micro_lamports: 2_000_000,
            hints,
            transaction_group: {} as any,
          },
        );

        const sigs = await signAndSendTransactions(serializedTxns);
        setTxSignatures(sigs);
        console.log("Close position transactions sent:", sigs);

        await fetchPositionsAndOrders();
      } catch (err: unknown) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to close position",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      privyWallet,
      connection,
      markets,
      signAndSendTransactions,
      fetchPositionsAndOrders,
    ],
  );

  return {
    // Data
    markets,
    positions,
    orders,
    isLoading,
    error,
    txSignatures,
    // Fetch
    fetchMarkets,
    fetchPositionsAndOrders,
    // Order operations
    submitOrder,
    submitCloseOrder,
    submitUpdateOrder,
    submitClosePosition,
    // LP operations
    submitDeposit,
    submitWithdrawal,
    submitShift,
    // Infra
    program,
    privyWallet,
    connection,
  };
};
