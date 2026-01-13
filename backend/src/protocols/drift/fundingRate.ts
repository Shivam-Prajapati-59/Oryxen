import type {
  DriftFundingRate,
  DriftFundingRateResponse,
  MarketFundingData,
} from "../../types/fundingRate";
import { calculateAllTimeframes } from "../../utils/fundingRate";
import { db } from "../../db/client";
import { perpsTable } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { FUNDING_RATE_PRECISION, PRICE_PRECISION } from "@drift-labs/sdk";

/* -----------------------------------------------------
   CONSTANTS (DRIFT PRECISION)
----------------------------------------------------- */
// const PRICE_PRECISION = 1e6;
// const FUNDING_RATE_PRECISION = 1e9;

/* -----------------------------------------------------
   FETCH FUNDING RATES FOR A MARKET
----------------------------------------------------- */
async function fetchFundingRatesForMarket(
  marketSymbol: string
): Promise<DriftFundingRate[]> {
  const url = `https://data.api.drift.trade/fundingRates?marketName=${marketSymbol}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as DriftFundingRateResponse;
    return data.fundingRates || [];
  } catch (error) {
    console.error(`Error fetching funding rates for ${marketSymbol}:`, error);
    return [];
  }
}

/* -----------------------------------------------------
   FETCH ACTIVE DRIFT PERPS FROM DB
----------------------------------------------------- */
async function getCoins(): Promise<string[]> {
  try {
    const driftPerps = await db
      .select()
      .from(perpsTable)
      .where(
        and(
          eq(perpsTable.market, "Drift Protocol"),
          eq(perpsTable.isActive, true)
        )
      );

    return driftPerps.map((perp) => perp.symbol);
  } catch (error) {
    console.error("Error fetching Drift coins:", error);
    return [];
  }
}

/* -----------------------------------------------------
   MAIN: GET ALL FUNDING RATES (PRECISION-CORRECT)
----------------------------------------------------- */
export async function getAllFundingRates(): Promise<MarketFundingData[]> {
  const markets = await getCoins();

  if (markets.length === 0) {
    console.warn("No Drift perps found in database");
    return [];
  }

  const allMarketData: MarketFundingData[] = [];

  const results = await Promise.allSettled(
    markets.map((market) => fetchFundingRatesForMarket(market))
  );

  results.forEach((result, index) => {
    if (result.status !== "fulfilled" || result.value.length === 0) return;

    const marketSymbol = markets[index];
    // FIX: Get the LAST element (most recent) instead of first
    const latestRate = result.value[result.value.length - 1];
    if (!latestRate) return;

    const rawFundingRate = Number(latestRate.fundingRate);
    const rawOraclePrice = Number(latestRate.oraclePriceTwap);

    if (rawOraclePrice === 0) {
      console.error(`Zero oracle price for ${marketSymbol}`);
      return;
    }

    /* -------------------------------------------------
       NORMALIZE VALUES (THIS IS THE FIX)
    ------------------------------------------------- */
    const fundingRate = rawFundingRate / FUNDING_RATE_PRECISION;
    const oraclePrice = rawOraclePrice / PRICE_PRECISION;
    const hourlyRate = fundingRate / oraclePrice;

    allMarketData.push({
      protocol: "drift",
      symbol: marketSymbol!,
      price: oraclePrice,
      hourlyRate,
      projections: calculateAllTimeframes(hourlyRate),
      timestamp: latestRate.slot,
      metadata: {
        slot: latestRate.slot,
        rawFundingRate,
        rawOraclePrice,
        normalizedFundingRate: fundingRate,
        normalizedOraclePrice: oraclePrice,
      },
    });
  });

  return allMarketData;
}
