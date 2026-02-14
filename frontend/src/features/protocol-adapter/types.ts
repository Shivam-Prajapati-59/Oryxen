// frontend/src/features/protocol-adapter/types.ts

export type ProtocolName = "drift" | "hyperliquid" | "raydium" | "jupiter";

export type OrderType = "market" | "limit" | "takeProfit" | "stopLimit";
export type TradeDirection = "long" | "short";

export interface OrderParams {
  marketIndex: number;
  orderType: OrderType;
  direction: TradeDirection;
  baseAssetAmount: number;
  price?: number;
  triggerPrice?: number;
  leverage?: number;
  reduceOnly?: boolean;
  postOnly?: boolean;
  takeProfit?: number;
  stopLoss?: number;
}

export interface TradeResult {
  signature: string;
  explorerUrl: string;
}

export interface CollateralInfo {
  totalCollateral: number;
  freeCollateral: number;
  marginUsed: number;
}

export interface MarketInfo {
  price: number;
  fundingRate?: number;
  availableLiquidity?: number;
  maxLeverage?: number;
}

export interface OrderEstimate {
  estimatedFee: {
    maker: number;
    taker: number;
  };
  estimatedLiquidationPrice?: number;
  availableLiquidity?: number;
  marginRequired: number;
}

export interface Position {
  marketIndex: number;
  marketSymbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice?: number;
}

/**
 * Common interface that all protocol adapters must implement
 */
export interface IProtocolAdapter {
  // Identification
  readonly name: ProtocolName;
  readonly displayName: string;

  // Initialization & State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  userAccountExists: boolean | null;

  initialize(): Promise<void>;
  initializeUserAccount(): Promise<void>;

  // Collateral Management
  deposit(amount: number, token: string): Promise<TradeResult>;
  withdraw(amount: number, token: string): Promise<TradeResult>;
  getCollateralInfo(): CollateralInfo;

  // Market Data
  getMarketInfo(marketIndex: number): MarketInfo;
  getMarketPrice(marketIndex: number): number;

  // Trading
  placeOrder(params: OrderParams): Promise<TradeResult>;
  estimateOrder(params: OrderParams): OrderEstimate;
  canAffordTrade(
    amount: number,
    marketIndex: number,
  ): {
    canAfford: boolean;
    reason?: string;
  };

  // Positions
  getPositions(): Position[];

  // Cleanup
  cleanup(): void;
}
