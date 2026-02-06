/**
 * Order side: "bid" to buy, "ask" to sell.
 * (Doc shows "bid" | "ask".) :contentReference[oaicite:2]{index=2}
 */
export type OrderSide = "bid" | "ask";

export interface StopOrderConfig {
  stop_price: string;
  limit_price?: string;
  client_order_id?: string;
}

export interface CreateMarketOrderRequest {
  // Required
  account: string; // User's wallet address (example: "42trU9A5...").
  signature: string; // Cryptographic signature.
  timestamp: number; // Current timestamp in milliseconds.
  symbol: string; // Trading pair symbol, e.g. "BTC".
  amount: string; // Order amount, represented as string in examples (e.g. "0.1").
  side: OrderSide; // "bid" | "ask".
  /** Maximum slippage tolerance in percentage. Doc table shows string, examples sometimes show number. */
  slippage_percent: string | number;
  reduce_only: boolean;

  // Optional
  client_order_id?: string; // Client-defined order id (UUID string).
  take_profit?: StopOrderConfig; // Take-profit stop order configuration (object).
  stop_loss?: StopOrderConfig; // Stop-loss order configuration (object).
  agent_wallet?: string; // Optional agent wallet address.
  expiry_window?: number;
}

export interface SuccessResponse {
  order_id: number;
}

export interface ErrorResponse {
  error: string;
  code: number;
}

export type MarketOrderResponse = SuccessResponse | ErrorResponse;

export const isSuccessResponse = (
  r: MarketOrderResponse,
): r is SuccessResponse => (r as SuccessResponse).order_id !== undefined;

export const OPERATION_TYPE_CREATE_MARKET = "create_market_order" as const;
export type OperationTypeCreateMarket = typeof OPERATION_TYPE_CREATE_MARKET;
