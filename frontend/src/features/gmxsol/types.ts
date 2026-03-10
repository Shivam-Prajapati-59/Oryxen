import type { CreateOrderKind } from "@gmsol-labs/gmsol-sdk";

export interface MarketInfo {
  address: string;
  /** The market token (LP) mint address — used by the SDK to identify the market. */
  marketTokenMint: string;
  name: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  isEnabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawAccount: any;
}

// ─── Order Form ─────────────────────────────────────────────────────

/** Form data for creating orders via the SDK adapter. */
export interface CreateOrderFormData {
  /** Market token mint address (identifies the market in the SDK) */
  marketToken: string;
  /** Collateral / swap-out token mint */
  collateralToken: string;
  /** Long token mint of the selected market */
  longToken: string;
  /** Short token mint of the selected market */
  shortToken: string;
  /** Order side */
  isLong: boolean;
  /** Order kind */
  orderKind: CreateOrderKind;
  /** Size delta in USD (raw bigint string, e.g. "100000000000000000000000") */
  sizeDeltaUsd: string;
  /** Pay / collateral token amount (raw token amount string) */
  amount: string;
  /** Trigger price for limit / stop-loss orders (optional, raw bigint string) */
  triggerPrice?: string;
  /** Take-profit price (optional, raw bigint string) */
  takeProfitPrice?: string;
  /** Stop-loss price (optional, raw bigint string) */
  stopLossPrice?: string;
}

// ─── Deposit Form ───────────────────────────────────────────────────

/** Form data for creating deposits via the SDK. */
export interface CreateDepositFormData {
  /** Market token mint address */
  marketToken: string;
  /** Long token mint of the selected market */
  longToken: string;
  /** Short token mint of the selected market */
  shortToken: string;
  /** Long pay token mint (usually same as longToken) */
  longPayToken: string;
  /** Short pay token mint (usually same as shortToken) */
  shortPayToken: string;
  /** Long pay amount (raw token amount string) */
  longPayAmount: string;
  /** Short pay amount (raw token amount string) */
  shortPayAmount: string;
  /** Minimum market tokens to receive (raw token amount string) */
  minReceiveAmount: string;
}

// ─── Withdrawal Form ────────────────────────────────────────────────

/** Form data for creating withdrawals via the SDK. */
export interface CreateWithdrawalFormData {
  /** Market token mint address */
  marketToken: string;
  /** Long token mint of the selected market */
  longToken: string;
  /** Short token mint of the selected market */
  shortToken: string;
  /** Market token amount to burn (raw token amount string) */
  marketTokenAmount: string;
}

// ─── Shift Form ─────────────────────────────────────────────────────

/** Form data for creating shifts via the SDK. */
export interface CreateShiftFormData {
  /** Source market token mint address */
  fromMarketToken: string;
  /** Destination market token mint address */
  toMarketToken: string;
  /** Amount of source market tokens to shift (raw token amount string) */
  fromMarketTokenAmount: string;
}
