import type { FundingRateProjections } from "../types/fundingRate";

const HOURS_PER_YEAR = 24 * 365.25; // Using 365.25 to account for leap years

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
    apr: hourly * HOURS_PER_YEAR, // APR = rate × 24 × 365.25
  };
};

export const formatProjections = (projections: FundingRateProjections) => {
  const toPct = (val: number) => val * 100;

  return {
    current: `${toPct(projections.current).toFixed(6)}%`,
    h4: `${toPct(projections.h4).toFixed(6)}%`,
    h8: `${toPct(projections.h8).toFixed(6)}%`,
    h12: `${toPct(projections.h12).toFixed(6)}%`,
    d1: `${toPct(projections.d1).toFixed(6)}%`,
    d7: `${toPct(projections.d7).toFixed(6)}%`,
    d30: `${toPct(projections.d30).toFixed(6)}%`,
    apr: `${toPct(projections.apr).toFixed(6)}%`,
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

export const driftFormatProjections = (projections: FundingRateProjections) => {
  const toPct = (val: number) => val * 100;

  return {
    current: `${toPct(projections.current).toFixed(6)}%`,
    h4: `${toPct(projections.h4).toFixed(6)}%`,
    h8: `${toPct(projections.h8).toFixed(6)}%`,
    h12: `${toPct(projections.h12).toFixed(6)}%`,
    d1: `${toPct(projections.d1).toFixed(6)}%`,
    d7: `${toPct(projections.d7).toFixed(6)}%`,
    d30: `${toPct(projections.d30).toFixed(6)}%`,
    apr: `${toPct(projections.apr).toFixed(6)}%`,
  };
};
