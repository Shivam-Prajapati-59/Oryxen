import type { FundingRateProjections } from "../../types/fundingRate";

const HOURS_PER_YEAR = 24 * 365.25; // Using 365.25 to account for leap years

//---- DRIFT FROMATTER ---- ///
// For new Drift contracts endpoint (drift.routes.ts)
export const calculateDriftProjections = (
  hourly: number,
): FundingRateProjections => {
  const dailyRate = hourly * 24;
  const apr = dailyRate * 365 * 100; // APR in percentage

  return {
    current: hourly,
    h4: hourly * 4,
    h8: hourly * 8,
    h12: hourly * 12,
    d1: dailyRate,
    d7: dailyRate * 7,
    d30: dailyRate * 30,
    apr: apr, // Already in percentage
  };
};
