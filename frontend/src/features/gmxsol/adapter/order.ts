/**
 * GMSOL Order Adapter — uses @gmsol-labs/gmsol-sdk (WASM) directly.
 *
 * Follows the exact SDK calling patterns from:
 * https://github.com/gmsol-labs/gmx-solana/blob/main/crates/sdk/tests/web/demo.ts
 */

import { getSDK, flattenTransactionGroup } from "./sdk";
import type {
  CreateOrderKind,
  CreateOrderParams,
  CreateOrderOptions,
  CloseOrderArgs,
  CloseOrderHint,
  UpdateOrderArgs,
  UpdateParams,
  UpdateOrderParams,
  UpdateOrderHint,
  CreateOrderHint,
  TransactionGroupOptions,
  BuildTransactionOptions,
} from "@gmsol-labs/gmsol-sdk";

// ─── Create Order ────────────────────────────────────────────────────

/**
 * Build serialized transactions for creating one or more orders.
 *
 * Uses `sdk.create_orders(kind, [params], options)` exactly like the demo:
 *
 * ```ts
 * const transactions = create_orders("MarketIncrease", [{ market_token, is_long, size, amount }], {
 *   recent_blockhash, payer, collateral_or_swap_out_token, compute_unit_price_micro_lamports,
 *   hints: new Map([[marketToken, { long_token, short_token }]]),
 *   transaction_group: { memo },
 * });
 * ```
 */
export async function buildCreateOrder(
  kind: CreateOrderKind,
  params: CreateOrderParams[],
  options: CreateOrderOptions,
): Promise<Uint8Array[]> {
  const sdk = await getSDK();
  const txGroup = sdk.create_orders(kind, params, options);
  return flattenTransactionGroup(txGroup.serialize());
}

/**
 * Build serialized transactions for creating orders with TP/SL using the
 * builder + merge pattern exactly as the demo shows:
 *
 * ```ts
 * const mainBuilder = create_orders_builder("MarketIncrease", [...], baseOptions);
 * const tpBuilder = create_orders_builder("LimitDecrease", [...], baseOptions);
 * const slBuilder = create_orders_builder("StopLossDecrease", [...], baseOptions);
 * mainBuilder.merge(tpBuilder);
 * mainBuilder.merge(slBuilder);
 * const txGroup = mainBuilder.build_with_options({}, { recent_blockhash, compute_unit_price_micro_lamports });
 * ```
 */
export async function buildCreateOrderWithTPSL(
  mainKind: CreateOrderKind,
  mainParams: CreateOrderParams[],
  baseOptions: CreateOrderOptions,
  tpParams?: {
    kind: CreateOrderKind;
    params: CreateOrderParams[];
    options: CreateOrderOptions;
  },
  slParams?: {
    kind: CreateOrderKind;
    params: CreateOrderParams[];
    options: CreateOrderOptions;
  },
  buildOptions?: BuildTransactionOptions,
  transactionGroupOptions?: TransactionGroupOptions | null,
): Promise<Uint8Array[]> {
  const sdk = await getSDK();

  const mainBuilder = sdk.create_orders_builder(
    mainKind,
    mainParams,
    baseOptions,
  );

  if (tpParams) {
    const tpBuilder = sdk.create_orders_builder(
      tpParams.kind,
      tpParams.params,
      tpParams.options,
    );
    mainBuilder.merge(tpBuilder);
  }

  if (slParams) {
    const slBuilder = sdk.create_orders_builder(
      slParams.kind,
      slParams.params,
      slParams.options,
    );
    mainBuilder.merge(slBuilder);
  }

  const txGroup = mainBuilder.build_with_options(
    transactionGroupOptions ?? null,
    buildOptions ?? null,
  );
  return flattenTransactionGroup(txGroup.serialize());
}

// ─── Close / Cancel Orders ──────────────────────────────────────────

/**
 * Build serialized transactions for closing (cancelling) orders.
 *
 * Uses `sdk.close_orders(args)` exactly like the demo:
 *
 * ```ts
 * const closeOrders = close_orders({
 *   recent_blockhash, payer,
 *   orders: new Map([
 *     ["orderAddress", { owner, receiver, rent_receiver, referrer, initial_collateral_token,
 *                        final_output_token, long_token, short_token, should_unwrap_native_token, callback }],
 *   ]),
 * });
 * ```
 */
export async function buildCloseOrders(
  args: CloseOrderArgs,
): Promise<Uint8Array[]> {
  const sdk = await getSDK();
  const txGroup = sdk.close_orders(args);
  return flattenTransactionGroup(txGroup.serialize());
}

// ─── Update Orders ──────────────────────────────────────────────────

/**
 * Build serialized transactions for updating orders.
 *
 * Uses `sdk.update_orders(args)` exactly like the demo:
 *
 * ```ts
 * const updateOrders = update_orders({
 *   recent_blockhash, payer,
 *   orders: new Map([
 *     ["orderAddress", { params: { size_delta_value }, hint: { market_token, callback: undefined } }],
 *     ["orderAddress2", { params: { trigger_price }, hint: { market_token, callback: undefined } }],
 *   ]),
 * });
 * ```
 */
export async function buildUpdateOrders(
  args: UpdateOrderArgs,
): Promise<Uint8Array[]> {
  const sdk = await getSDK();
  try {
    const txGroup = sdk.update_orders(args);
    return flattenTransactionGroup(txGroup.serialize());
  } catch (error) {
    // Intercept WASM panics or formatting errors here
    console.error("SDK Update Order Error:", error);
    throw new Error("Failed to construct update order transaction payload.");
  }
}

// ─── Re-exports ─────────────────────────────────────────────────────

export type {
  CreateOrderKind,
  CreateOrderParams,
  CreateOrderOptions,
  CreateOrderHint,
  CloseOrderArgs,
  CloseOrderHint,
  UpdateOrderArgs,
  UpdateParams,
  UpdateOrderParams,
  UpdateOrderHint,
  TransactionGroupOptions,
  BuildTransactionOptions,
};
