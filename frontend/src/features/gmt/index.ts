/**
 * GMTrade feature module — public exports.
 *
 * Usage:
 *   import { useGmt, GMT_NETWORK } from "@/features/gmt";
 */

export { useGmt } from "./hooks/useGmt";

export {
  GMSOL_STORE_PROGRAM_ID,
  GMT_CONNECTION,
  GMT_NETWORK,
  GMT_CHAIN_PREFIX,
  GMT_PROGRAM,
  MARKET_USD_UNIT,
  SOL_PRICE_UNIT,
  TOKEN_DECIMALS,
  getTokenPriceUnit,
  NATIVE_SOL_MINT,
} from "./constants";

export type {
  MarketInfo,
  MarketMeta,
  PositionInfo,
  PositionSide,
  OrderInfo,
  OrderKind,
  TradeResult,
  OpenPositionParams,
  OpenLimitOrderParams,
  ClosePositionParams,
  TpSlParams,
  UpdateOrderParams,
  CancelOrderParams,
  SwapParams,
} from "./types";
