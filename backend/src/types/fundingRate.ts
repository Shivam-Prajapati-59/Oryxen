// Common response structure
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: number;
  count?: number;
  error?: string;
}

// Drift specific types
export interface DriftFundingRate {
  slot: number;
  fundingRate: number;
  oraclePriceTwap: string;
}

export interface DriftFundingRateResponse {
  fundingRates: DriftFundingRate[];
}

// Hyperliquid specific types
export interface HyperliquidFundingRate {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

// Funding rate projections for different timeframes
export interface FundingRateProjections {
  current: number;
  h4: number;
  h8: number;
  h12: number;
  d1: number;
  d7: number;
  d30: number;
  apr: number; // APR in percentage
}

// Normalized market data (common format for all protocols)
export interface MarketFundingData {
  protocol: string;
  symbol: string;
  price: number | null;
  hourlyRate: number;
  projections: FundingRateProjections;
  timestamp: number;
  metadata?: Record<string, any>;
}
