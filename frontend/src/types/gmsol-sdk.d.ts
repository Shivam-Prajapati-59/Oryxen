/**
 * Type declarations for @gmsol-labs/gmsol-sdk (WASM package).
 *
 * This package is dynamically imported at runtime and may not ship its own
 * TypeScript declarations. These ambient declarations allow the codebase to
 * type-check without the package installed in node_modules.
 */
declare module "@gmsol-labs/gmsol-sdk" {
  // ── Order Types ─────────────────────────────────────────────────

  export type CreateOrderKind =
    | "MarketSwap"
    | "LimitSwap"
    | "MarketIncrease"
    | "LimitIncrease"
    | "MarketDecrease"
    | "LimitDecrease"
    | "StopLossDecrease"
    | "Liquidation";

  export interface CreateOrderParams {
    market_token: string;
    is_long: boolean;
    size: bigint;
    amount: bigint;
    trigger_price?: bigint;
  }

  export interface CreateOrderHint {
    long_token: string;
    short_token: string;
  }

  export interface CreateOrderOptions {
    recent_blockhash: string;
    payer: string;
    collateral_or_swap_out_token?: string;
    compute_unit_price_micro_lamports?: number;
    hints?: Map<string, CreateOrderHint>;
    transaction_group?: TransactionGroupOptions;
    receive_token?: string;
  }

  export interface CloseOrderHint {
    owner: string;
    receiver: string;
    rent_receiver: string;
    referrer?: string;
    initial_collateral_token?: string;
    final_output_token?: string;
    long_token: string;
    short_token: string;
    should_unwrap_native_token: boolean;
    callback?: unknown;
  }

  export interface CloseOrderArgs {
    recent_blockhash: string;
    payer: string;
    orders: Map<string, CloseOrderHint>;
  }

  export interface UpdateOrderParams {
    size_delta_value?: bigint;
    trigger_price?: bigint;
  }

  export interface UpdateOrderHint {
    market_token: string;
    callback?: unknown;
  }

  export interface UpdateParams {
    params: UpdateOrderParams;
    hint: UpdateOrderHint;
  }

  export interface UpdateOrderArgs {
    recent_blockhash: string;
    payer: string;
    orders: Map<string, UpdateParams>;
  }

  // ── Transaction Group ───────────────────────────────────────────

  export interface TransactionGroupOptions {
    memo?: string;
  }

  export interface BuildTransactionOptions {
    recent_blockhash?: string;
    compute_unit_price_micro_lamports?: number;
  }

  export interface SerializedTransactionGroup {
    serialize(): number[][][];
  }

  // ── Order Builder ───────────────────────────────────────────────

  export interface OrderBuilder {
    merge(other: OrderBuilder): void;
    build_with_options(
      transactionGroupOptions: TransactionGroupOptions | null,
      buildOptions: BuildTransactionOptions | null,
    ): SerializedTransactionGroup;
  }

  // ── Deposit Types ───────────────────────────────────────────────

  export interface CreateDepositParamsJs {
    market_token: string;
    receiver: string;
    long_pay_token: string;
    short_pay_token: string;
    long_swap_path: string[];
    short_swap_path: string[];
    long_pay_amount: bigint;
    short_pay_amount: bigint;
    min_receive_amount: bigint;
    unwrap_native_on_receive: boolean;
  }

  export interface CreateDepositHint {
    pool_tokens: {
      long_token: string;
      short_token: string;
    };
  }

  export interface CreateDepositOptions {
    recent_blockhash: string;
    payer: string;
    hints?: Map<string, CreateDepositHint>;
    transaction_group?: TransactionGroupOptions;
  }

  // ── Withdrawal Types ────────────────────────────────────────────

  export interface CreateWithdrawalParamsJs {
    market_token: string;
    market_token_amount: bigint;
  }

  export interface CreateWithdrawalHint {
    pool_tokens: {
      long_token: string;
      short_token: string;
    };
  }

  export interface CreateWithdrawalOptions {
    recent_blockhash: string;
    payer: string;
    hints?: Map<string, CreateWithdrawalHint>;
    transaction_group?: TransactionGroupOptions;
  }

  // ── Shift Types ─────────────────────────────────────────────────

  export interface CreateShiftParamsJs {
    from_market_token: string;
    to_market_token: string;
    from_market_token_amount: bigint;
  }

  export interface CreateShiftOptions {
    recent_blockhash: string;
    payer: string;
    transaction_group?: TransactionGroupOptions;
  }

  // ── Simulation Types ────────────────────────────────────────────

  export interface Value {
    amount: bigint;
    value: bigint;
  }

  export interface SimulateOrderArgs {
    is_long: boolean;
    size_delta_usd: bigint;
    initial_collateral_delta_amount: bigint;
    trigger_price?: bigint;
    acceptable_price?: bigint;
    is_increase: boolean;
    market_token: string;
    initial_collateral_token: string;
  }

  export interface SimulateDepositArgs {
    market_token: string;
    long_token_amount: bigint;
    short_token_amount: bigint;
  }

  export interface SimulateWithdrawalArgs {
    market_token: string;
    market_token_amount: bigint;
  }

  export interface SimulateShiftArgs {
    from_market_token: string;
    to_market_token: string;
    from_market_token_amount: bigint;
  }

  // ── Market / Position / TradeEvent classes ──────────────────────

  export class Market {
    static decode_from_base64(data: string): Market;
    to_model(): unknown;
  }

  export class Position {
    static decode_from_base64(data: string): Position;
    to_model(): unknown;
  }

  export class TradeEvent {
    static decode_from_base64_with_options(
      data: string,
      noDiscriminator?: boolean | null,
    ): TradeEvent;
    to_position_model(): unknown;
  }

  export class MarketGraph {
    constructor(config: {
      swap_estimation_params: { value: bigint; base_cost: bigint };
      max_steps: number;
    });
    insert_market_from_base64(data: string, supply: bigint): void;
    to_simulator(): Simulator;
  }

  export interface Simulator {
    simulate_order(args: SimulateOrderArgs, position?: unknown): unknown;
    simulate_deposit(args: SimulateDepositArgs): unknown;
    simulate_withdrawal(args: SimulateWithdrawalArgs): unknown;
    simulate_shift(args: SimulateShiftArgs): unknown;
  }

  export class Pubkey {
    constructor(address: string);
    toString(): string;
  }

  // ── Top-level Functions ─────────────────────────────────────────

  export function solana_program_init(): void;

  export function create_orders(
    kind: CreateOrderKind,
    params: CreateOrderParams[],
    options: CreateOrderOptions,
  ): SerializedTransactionGroup;

  export function create_orders_builder(
    kind: CreateOrderKind,
    params: CreateOrderParams[],
    options: CreateOrderOptions,
  ): OrderBuilder;

  export function close_orders(
    args: CloseOrderArgs,
  ): SerializedTransactionGroup;

  export function update_orders(
    args: UpdateOrderArgs,
  ): SerializedTransactionGroup;

  export function create_deposits(
    params: CreateDepositParamsJs[],
    options: CreateDepositOptions,
  ): SerializedTransactionGroup;

  export function create_withdrawals(
    params: CreateWithdrawalParamsJs[],
    options: CreateWithdrawalOptions,
  ): SerializedTransactionGroup;

  export function create_shifts(
    params: CreateShiftParamsJs[],
    options: CreateShiftOptions,
  ): SerializedTransactionGroup;

  export function apply_factor(value: bigint, factor: bigint): bigint;

  export function default_store_program(): { program: string; store: string };
}
