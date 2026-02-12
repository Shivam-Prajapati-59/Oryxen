/**
 * Drift Protocol — TypeScript types.
 *
 * Re-exported from `features/drift/` so consumers import from one place.
 * Original source: `types/drift.ts`.
 */

export {
  type OrderVariant,
  type TradeDirection,
  toPositionDirection,
  toOrderType,
  getTriggerCondition,
  type BaseOrderParams,
  type MarketOrderParams,
  type LimitOrderParams,
  type TakeProfitOrderParams,
  type StopLimitOrderParams,
  type ScaleOrderParams,
  type SingleOrderParams,
  type PlaceOrderParams,
  type ExecuteTradeParams,
  type CancelOrderParams,
  type CancelAllOrdersParams,
  type ModifyOrderParams,
  type PerpPositionInfo,
  type OpenOrderInfo,
  type TradeResult,
  type OrderResult,
  type ScaleOrderResult,
  type SpotBalance,
  type AccountSummary,
  OrderType,
  MarketType,
  PositionDirection,
  OrderTriggerCondition,
  type OptionalOrderParams,
} from "@/types/drift";
