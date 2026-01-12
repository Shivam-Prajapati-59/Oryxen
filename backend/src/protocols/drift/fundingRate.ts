import type {
  DriftFundingRate,
  DriftFundingRateResponse,
  MarketFundingData,
} from "../../types/fundingRate";
import { calculateAllTimeframes } from "../../utils/fundingRate";
import { db } from "../../db/client";
import { perpsTable } from "../../db/schema";
import { and, eq } from "drizzle-orm";

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

    // Return just the symbol for Drift API
    return driftPerps.map((perp) => perp.symbol);
  } catch (error: any) {
    console.error("Error fetching Drift coins:", error);
    return [];
  }
}

export async function getAllFundingRates(): Promise<MarketFundingData[]> {
  // Fetch markets from database
  const markets = await getCoins();

  if (markets.length === 0) {
    console.warn("No Drift perps found in database");
    return [];
  }

  const allMarketData: MarketFundingData[] = [];

  // Fetch funding rates for all markets in parallel
  const results = await Promise.allSettled(
    markets.map((marketSymbol) => fetchFundingRatesForMarket(marketSymbol))
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.length > 0) {
      const marketSymbol = markets[index];
      const latestRate = result.value[0];

      if (!latestRate || !marketSymbol) return;

      // Calculate hourly funding rate
      const fundingRatePct =
        parseFloat(latestRate.fundingRate) /
        1e9 /
        (parseFloat(latestRate.oraclePriceTwap) / 1e6);

      const oraclePrice = parseFloat(latestRate.oraclePriceTwap) / 1e6;
      if (oraclePrice <= 0) {
        console.error(
          `Invalid Oracle Price for ${marketSymbol}: ${oraclePrice}`
        );
        return;
      }

      allMarketData.push({
        protocol: "drift",
        symbol: marketSymbol,
        price: oraclePrice,
        hourlyRate: fundingRatePct,
        projections: calculateAllTimeframes(fundingRatePct),
        timestamp: latestRate.slot,
        metadata: {
          slot: latestRate.slot,
          rawFundingRate: latestRate.fundingRate,
          oraclePriceTwap: oraclePrice,
        },
      });
    }
  });

  return allMarketData;
}
