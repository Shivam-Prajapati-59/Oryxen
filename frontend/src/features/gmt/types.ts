/**
 * TypeScript types for GMTrade interactions.
 *
 * Maps closely to the on-chain data structures from the gmsol_store IDL
 * and the Rust CLI argument patterns.
 */

// ─── Order kinds (matches IDL OrderKind enum) ────────────────────────

export enum OrderKind {
  Liquidation = "Liquidation",
  AutoDeleveraging = "AutoDeleveraging",
  MarketSwap = "MarketSwap",
  MarketIncrease = "MarketIncrease",
  MarketDecrease = "MarketDecrease",
  LimitSwap = "LimitSwap",
  LimitIncrease = "LimitIncrease",
  LimitDecrease = "LimitDecrease",
  StopLossDecrease = "StopLossDecrease",
}

// ─── Decrease position swap type ─────────────────────────────────────

export enum DecreasePositionSwapType {
  NoSwap = "NoSwap",
  PnlTokenToCollateralToken = "PnlTokenToCollateralToken",
  CollateralToPnlToken = "CollateralToPnlToken",
}

// ─── Market info ─────────────────────────────────────────────────────

export interface MarketMeta {
  marketTokenMint: string;
  indexTokenMint: string;
  longTokenMint: string;
  shortTokenMint: string;
}

export interface MarketInfo {
  address: string;
  name: string;
  meta: MarketMeta;
}

// ─── Position info ───────────────────────────────────────────────────

export type PositionSide = "long" | "short";

export interface PositionInfo {
  address: string;
  store: string;
  owner: string;
  marketToken: string;
  side: PositionSide;
  kind: number;
  sizeInUsd: string;
  sizeInTokens: string;
  collateralAmount: string;
}

// ─── Order info ──────────────────────────────────────────────────────

export interface OrderInfo {
  address: string;
  kind: OrderKind;
  isLong: boolean;
  sizeDeltaValue: string;
  triggerPrice: string;
  collateralAmount: string;
}

// ─── Trading parameters ──────────────────────────────────────────────

export interface OpenPositionParams {
  /** Market name, e.g. "SOL/USD[WSOL-USDC]" */
  marketName: string;
  /** Collateral in lamports (e.g. 500000000 = 0.5 SOL) */
  collateralLamports: number;
  /** Position size in whole USD (e.g. 1000 = $1000) */
  sizeUsdWhole: number;
  /** Long or short */
  isLong: boolean;
  /** Whether the collateral token is the market's long token */
  isCollateralLong?: boolean;
}

export interface OpenLimitOrderParams extends OpenPositionParams {
  /** Trigger price in whole USD (e.g. 120 = $120) */
  triggerPriceUsd: number;
}

export interface ClosePositionParams {
  marketName: string;
  side: PositionSide;
  /** Size to close in whole USD; 0 = close entire position */
  sizeUsdWhole: number;
  isCollateralLong?: boolean;
}

export interface TpSlParams {
  marketName: string;
  side: PositionSide;
  sizeUsdWhole: number;
  /** Target price in whole USD */
  priceUsd: number;
  isCollateralLong?: boolean;
}

export interface UpdateOrderParams {
  marketName: string;
  orderAddress: string;
  newPriceUsd: number;
}

export interface CancelOrderParams {
  orderAddress: string;
}

export interface SwapParams {
  marketName: string;
  fromTokenMint: string;
  amountLamports: number;
  wantLongToken: boolean;
}

// ─── Trade result ────────────────────────────────────────────────────

export interface TradeResult {
  success: boolean;
  txSignature?: string;
  orderAddress?: string;
  error?: string;
}
