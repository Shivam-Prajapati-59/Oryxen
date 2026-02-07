import type { BN } from "@coral-xyz/anchor";
import type { Cluster } from "@solana/web3.js";
import type {
  PerpetualsClient,
  PoolConfig,
  MarketConfig,
  Token,
  CustodyConfig,
  OraclePrice,
  PositionAccount,
  OrderAccount,
} from "flash-sdk";
import { Side } from "flash-sdk";

/** Supported Flash cluster environments */
export type FlashCluster = Extract<Cluster, "devnet" | "mainnet-beta">;

/** Flash pool name for each cluster */
export type FlashPoolName = "devnet.1" | "Crypto.1";

export interface FlashConfig {
  cluster: FlashCluster;
  poolName: FlashPoolName;
  rpcUrl: string;
  chainPrefix: string;
  prioritizationFee: number;
}

export interface FlashClientState {
  client: PerpetualsClient | null;
  poolConfig: PoolConfig | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

// Trade Direction & Order Variants

export type TradeDirection = "long" | "short";

export type OrderVariant = "market" | "limit" | "stopLoss" | "takeProfit";

/** Convert UI direction to Flash SDK Side */
export const toFlashSide = (
  direction: TradeDirection,
): typeof Side.Long | typeof Side.Short => {
  return direction === "long" ? Side.Long : Side.Short;
};

export interface FlashBaseOrderParams {
  targetSymbol: string;
  collateralSymbol: string;
  direction: TradeDirection;
  collateralAmount: number;
  sizeUsd: number;
  leverage: number;
}

export interface FlashMarketOrderParams extends FlashBaseOrderParams {
  orderVariant: "market";
}

export interface FlashLimitOrderParams extends FlashBaseOrderParams {
  orderVariant: "limit";
  /** Limit/trigger price in USD */
  price: number;
}

export interface FlashTakeProfitParams extends FlashBaseOrderParams {
  orderVariant: "takeProfit";
  triggerPrice: number;
}

export interface FlashStopLossParams extends FlashBaseOrderParams {
  orderVariant: "stopLoss";
  triggerPrice: number;
}

export type FlashOrderParams =
  | FlashMarketOrderParams
  | FlashLimitOrderParams
  | FlashTakeProfitParams
  | FlashStopLossParams;

// Position & Order Info (UI-facing)

export interface FlashPositionInfo {
  publicKey: string;
  market: string;
  direction: TradeDirection;
  entryPrice: number;
  sizeUsd: number;
  collateralUsd: number;
  leverage: number;
  pnlUsd: number;
  liquidationPrice: number;
  openTime: number;
}

export interface FlashOrderInfo {
  publicKey: string;
  market: string;
  orderVariant: OrderVariant;
  direction: TradeDirection;
  price: number;
  sizeUsd: number;
}

// Trade Result
export interface FlashTradeResult {
  success: boolean;
  txSignature?: string;
  error?: string;
}

// Token info helper

/** Available trading tokens on devnet pool */
export const FLASH_DEVNET_TOKENS = ["SOL", "BTC", "ETH", "USDC"] as const;
export type FlashDevnetToken = (typeof FLASH_DEVNET_TOKENS)[number];

/** Available trading tokens on mainnet Crypto.1 pool */
export const FLASH_MAINNET_TOKENS = ["SOL", "BTC", "ETH", "USDC"] as const;
export type FlashMainnetToken = (typeof FLASH_MAINNET_TOKENS)[number];
