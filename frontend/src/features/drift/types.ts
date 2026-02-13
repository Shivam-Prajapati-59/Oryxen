import {
  OrderType,
  MarketType,
  PositionDirection,
  OrderTriggerCondition,
  PostOnlyParams,
  OptionalOrderParams,
  BN,
} from "@drift-labs/sdk-browser";

// ============================================
// Order Variant Types (UI-friendly)
// ============================================

/** UI-friendly order variant selection */
export type OrderVariant =
  | "market"
  | "limit"
  | "takeProfit"
  | "stopLimit"
  | "scale";

/** Trade direction for UI */
export type TradeDirection = "long" | "short";

// ============================================
// Helper Functions
// ============================================

/** Convert UI direction to SDK PositionDirection */
export const toPositionDirection = (
  direction: TradeDirection,
): PositionDirection => {
  return direction === "long"
    ? PositionDirection.LONG
    : PositionDirection.SHORT;
};

/** Convert UI order variant to SDK OrderType */
export const toOrderType = (variant: OrderVariant): OrderType => {
  switch (variant) {
    case "market":
      return OrderType.MARKET;
    case "limit":
      return OrderType.LIMIT;
    case "takeProfit":
    case "stopLimit":
      return OrderType.TRIGGER_LIMIT;
    case "scale":
      return OrderType.LIMIT;
    default:
      return OrderType.MARKET;
  }
};

/** Get trigger condition based on order variant and direction */
export const getTriggerCondition = (
  variant: OrderVariant,
  direction: TradeDirection,
): OrderTriggerCondition | undefined => {
  if (variant === "takeProfit") {
    // Take profit: trigger when price moves favorably
    return direction === "long"
      ? OrderTriggerCondition.ABOVE
      : OrderTriggerCondition.BELOW;
  }
  if (variant === "stopLimit") {
    // Stop limit: trigger when price moves unfavorably
    return direction === "long"
      ? OrderTriggerCondition.BELOW
      : OrderTriggerCondition.ABOVE;
  }
  return undefined;
};

// ============================================
// Base Order Parameters
// ============================================

export interface BaseOrderParams {
  /** The perp market index to trade on */
  marketIndex: number;
  /** Trade direction - long or short */
  direction: TradeDirection;
  /** Base asset amount in human-readable units (e.g., 0.1 SOL) */
  baseAssetAmount: number;
  /** Sub account ID (default: 0) */
  subAccountId?: number;
  /** Whether this order should only reduce an existing position */
  reduceOnly?: boolean;
}

// ============================================
// Single Order Parameters
// ============================================

/** Parameters for placing a market order */
export interface MarketOrderParams extends BaseOrderParams {
  orderVariant: "market";
}

/** Parameters for placing a limit order */
export interface LimitOrderParams extends BaseOrderParams {
  orderVariant: "limit";
  /** Limit price in USD */
  price: number;
  /** Post-only mode - order will only be placed if it would be a maker order */
  postOnly?: boolean;
  /** Immediate or cancel - order will be cancelled if not filled immediately */
  immediateOrCancel?: boolean;
}

/** Parameters for placing a take profit order */
export interface TakeProfitOrderParams extends BaseOrderParams {
  orderVariant: "takeProfit";
  /** Limit price to execute at when triggered */
  price: number;
  /** Trigger price - order activates when price crosses this level */
  triggerPrice: number;
}

/** Parameters for placing a stop limit order */
export interface StopLimitOrderParams extends BaseOrderParams {
  orderVariant: "stopLimit";
  /** Limit price to execute at when triggered */
  price: number;
  /** Trigger price - order activates when price crosses this level */
  triggerPrice: number;
}

// ============================================
// Scale Order Parameters
// ============================================

/** Parameters for placing multiple orders across a price range */
export interface ScaleOrderParams extends BaseOrderParams {
  orderVariant: "scale";
  /** Starting price for the scale orders */
  startPrice: number;
  /** Ending price for the scale orders */
  endPrice: number;
  /** Number of orders to place across the range */
  orderCount: number;
}

// ============================================
// Combined Order Types
// ============================================

/** Union type for all single order params */
export type SingleOrderParams =
  | MarketOrderParams
  | LimitOrderParams
  | TakeProfitOrderParams
  | StopLimitOrderParams;

/** Union type for all order params including scale */
export type PlaceOrderParams = SingleOrderParams | ScaleOrderParams;

// ============================================
// Generic Execute Trade Params (for hook)
// ============================================

/** Flexible params for the useDrift hook's place order functions */
export interface ExecuteTradeParams {
  /** Market index for the perpetual market */
  marketIndex: number;
  /** Trade direction */
  direction: TradeDirection;
  /** Base asset amount in human-readable units */
  baseAssetAmount: number;
  /** Order variant type */
  orderVariant: OrderVariant;
  /** Limit price (required for limit, takeProfit, stopLimit) */
  price?: number;
  /** Trigger price (required for takeProfit, stopLimit) */
  triggerPrice?: number;
  /** Start price (required for scale orders) */
  startPrice?: number;
  /** End price (required for scale orders) */
  endPrice?: number;
  /** Number of orders (required for scale orders) */
  orderCount?: number;
  /** Sub account ID */
  subAccountId?: number;
  /** Reduce only flag */
  reduceOnly?: boolean;
  /** Post only flag for limit orders */
  postOnly?: boolean;
  /** Immediate or cancel flag */
  immediateOrCancel?: boolean;
}

// ============================================
// Order Management Types
// ============================================

export interface CancelOrderParams {
  /** Order ID to cancel */
  orderId?: number;
  /** User order ID to cancel */
  userOrderId?: number;
  /** Market index (required if cancelling by market) */
  marketIndex?: number;
  /** Market type */
  marketType?: MarketType;
  /** Sub account ID */
  subAccountId?: number;
}

export interface CancelAllOrdersParams {
  /** Market index (optional - if not provided, cancels all orders) */
  marketIndex?: number;
  /** Market type */
  marketType?: MarketType;
  /** Sub account ID */
  subAccountId?: number;
  /** Direction to cancel (optional - if not provided, cancels both) */
  direction?: TradeDirection;
}

export interface ModifyOrderParams {
  /** Order ID to modify */
  orderId: number;
  /** New base amount (human-readable) */
  baseAssetAmount?: number;
  /** New price */
  price?: number;
  /** New trigger price */
  triggerPrice?: number;
  /** New reduce only flag */
  reduceOnly?: boolean;
  /** Sub account ID */
  subAccountId?: number;
}

// ============================================
// Position Types
// ============================================

export interface PerpPositionInfo {
  marketIndex: number;
  marketName: string;
  baseAssetAmount: BN;
  quoteAssetAmount: BN;
  quoteEntryAmount: BN;
  quoteBreakEvenAmount: BN;
  openOrders: number;
  openBids: BN;
  openAsks: BN;
  settledPnl: BN;
  lpShares: BN;
  /** Computed direction from base asset amount */
  direction: "long" | "short" | "none";
  /** Position size in human-readable units */
  size: number;
  /** Notional value in USD */
  notionalValue: number;
  /** Unrealized PnL in USD */
  unrealizedPnl: number;
  /** Entry price in USD */
  entryPrice: number;
  /** Break-even price in USD */
  breakEvenPrice: number;
  /** Current mark price */
  markPrice: number;
  /** Liquidation price (if applicable) */
  liquidationPrice?: number;
}

// ============================================
// Open Order Types
// ============================================

export interface OpenOrderInfo {
  orderId: number;
  userOrderId: number;
  marketIndex: number;
  marketName: string;
  orderType: OrderType;
  direction: PositionDirection;
  /** Order size in human-readable units */
  size: number;
  /** Filled size in human-readable units */
  filledSize: number;
  /** Order price (for limit orders) */
  price: number;
  /** Trigger price (for trigger orders) */
  triggerPrice?: number;
  /** Trigger condition */
  triggerCondition?: OrderTriggerCondition;
  /** Slot when order was placed */
  slot: BN;
  /** Whether order is reduce only */
  reduceOnly: boolean;
  /** Whether order is post only */
  postOnly: boolean;
}

// ============================================
// Trade Result Types
// ============================================

export interface TradeResult {
  txSig: string;
  explorerUrl: string;
  orderId?: number;
}

export interface OrderResult {
  txSig: string;
  explorerUrl: string;
  orderId: number;
  userOrderId?: number;
}

export interface ScaleOrderResult {
  txSig: string;
  explorerUrl: string;
  orderCount: number;
}

// ============================================
// Account Balance Types
// ============================================

export interface SpotBalance {
  marketIndex: number;
  symbol: string;
  /** Raw token balance in human-readable units (e.g. 1.5 SOL) */
  balance: number;
  /** Balance value in USD */
  balanceUsd: number;
  /** Token decimals from the spot market account */
  decimals: number;
  balanceType: "deposit" | "borrow";
}

export interface AccountSummary {
  /** Total collateral in USD */
  totalCollateral: number;
  /** Free collateral available for trading */
  freeCollateral: number;
  /** Initial margin requirement */
  initialMarginRequirement: number;
  /** Maintenance margin requirement */
  maintenanceMarginRequirement: number;
  /** Current margin ratio (collateral / margin requirement) */
  marginRatio: number;
  /** Current leverage */
  leverage: number;
  /** Total unrealized PnL across all positions */
  unrealizedPnl: number;
  /** All perp positions */
  perpPositions: PerpPositionInfo[];
  /** All spot balances */
  spotBalances: SpotBalance[];
  /** All open orders */
  openOrders: OpenOrderInfo[];
}

// ============================================
// Re-exports from SDK for convenience
// ============================================

export {
  OrderType,
  MarketType,
  PositionDirection,
  OrderTriggerCondition,
  type OptionalOrderParams,
};
