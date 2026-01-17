// Drift FundingRate Response
export interface FundingRateApiResponse {
  fundingRates: FundingRate[];
}

export interface FundingRate {
  slot: number;
  fundingRate: string;
  oraclePriceTwap: string;
  symbol?: string;
  marketIndex?: number;
}

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

export interface MarketFundingData {
  protocol: string;
  symbol: string;
  price: number | null;
  imageUrl: string;
  fundingRate: number;
  projections: FundingRateProjections;
  timestamp: number;
  metadata?: Record<string, any>;
}

//
