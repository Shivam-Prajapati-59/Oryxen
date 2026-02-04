// Hyperliquid Clearinghouse State Types
export interface AssetPosition {
  position: {
    coin: string;
    entryPx: string;
    leverage: {
      type: string;
      value: number;
    };
    liquidationPx: string;
    marginUsed: string;
    maxTradeSzs: [string, string];
    positionValue: string;
    returnOnEquity: string;
    szi: string;
    unrealizedPnl: string;
  };
  type: string;
}

export interface MarginSummary {
  accountValue: string;
  totalMarginUsed: string;
  totalNtlPos: string;
  totalRawUsd: string;
}

export interface CrossMarginSummary {
  accountValue: string;
  totalMarginUsed: string;
  totalNtlPos: string;
  totalRawUsd: string;
}

export interface WithdrawableBalance {
  value: string;
}

export interface UserState {
  assetPositions: AssetPosition[];
  crossMarginSummary: CrossMarginSummary;
  marginSummary: MarginSummary;
  withdrawable: string;
  time: number;
}

export interface BalanceInfo {
  usdcBalance: string;
  walletUsdcBalance: string;
  nativeBalance: string;
  accountValue: string;
  withdrawable: string;
}

// Order Types
export interface OrderParams {
  coin: string;
  isBuy: boolean;
  sz: string;
  limitPx: string;
  orderType: "Limit" | "Market";
  reduceOnly?: boolean;
}

export interface OrderResponse {
  status: string;
  response?: {
    type: string;
    data?: {
      statuses?: Array<{
        filled?: {
          totalSz: string;
          avgPx: string;
        };
      }>;
    };
  };
}

export interface SelectedAsset {
  name: string;
  szDecimals: number;
}
