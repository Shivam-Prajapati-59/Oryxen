/**
 * Pacifica — TypeScript types.
 *
 * Re-exported from `features/pacifica/` so consumers import from one place.
 * Original source: `types/pacifica.ts`.
 */

export {
  type OrderSide,
  type StopOrderConfig,
  type CreateMarketOrderRequest,
  type SuccessResponse,
  type ErrorResponse,
  type MarketOrderResponse,
  isSuccessResponse,
  OPERATION_TYPE_CREATE_MARKET,
  type OperationTypeCreateMarket,
} from "@/types/pacifica";
