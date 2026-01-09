import type { FundingRateProjections } from "../types/fundingRate";

const HOUR_IN_YEAR = 24 * 365;

export const calculateAllTimeframes = (
  hourly: number
): FundingRateProjections => {
  return {
    current: hourly,
    h4: hourly * 4,
    h8: hourly * 8,
    h12: hourly * 12,
    d1: hourly * 24,
    d7: hourly * 168,
    d30: hourly * 720,
    apr: hourly * HOUR_IN_YEAR * 100, // In Percentage
  };
};

export const formatProjections = (projections: FundingRateProjections) => {
  return {
    current: `${(projections.current * 100).toFixed(6)}%`,
    h4: `${(projections.h4 * 100).toFixed(6)}%`,
    h8: `${(projections.h8 * 100).toFixed(6)}%`,
    h12: `${(projections.h12 * 100).toFixed(6)}%`,
    d1: `${(projections.d1 * 100).toFixed(4)}%`,
    d7: `${(projections.d7 * 100).toFixed(4)}%`,
    d30: `${(projections.d30 * 100).toFixed(2)}%`,
    apr: `${projections.apr.toFixed(2)}%`,
  };
};

export const normalizeFundingData = (rawDrift: any, rawHyper: any) => {
  const driftData = rawDrift.data.map((item: any) => {
    const hourly = item.fundingRate; // Drift already provides hourly
    return {
      protocol: "drift",
      symbol: item.marketSymbol,
      price: item.metadata.oraclePriceTwap,
      hourlyRate: hourly,
      projections: calculateAllTimeframes(hourly),
    };
  });

  const hyperData = rawHyper.data.map((item: any) => {
    const hourly = item.fundingRate; // Hyperliquid also provides hourly
    return {
      protocol: "hyperliquid",
      symbol: item.marketSymbol,
      price: null, // Hyperliquid needs a separate call for price
      hourlyRate: hourly,
      projections: calculateAllTimeframes(hourly),
    };
  });

  return [...driftData, ...hyperData];
};
