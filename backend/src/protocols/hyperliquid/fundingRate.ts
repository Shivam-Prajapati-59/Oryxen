import type {
  HyperliquidFundingRate,
  MarketFundingData,
} from "../../types/fundingRate";
import { calculateAllTimeframes } from "../../utils/fundingRate";
import { db } from "../../db/client";
import { perpsTable } from "../../db/schema";
import { and, eq } from "drizzle-orm";

async function fetchFundingRatesForMarket(
  coin: string
): Promise<HyperliquidFundingRate[]> {
  const url = "https://api.hyperliquid.xyz/info";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "fundingHistory",
        coin: coin,
        startTime: Date.now() - 24 * 60 * 60 * 1000, // last 24 hours
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching funding rates for ${coin}:`, error);
    return [];
  }
}

async function fetchAllMidPrices(): Promise<Record<string, number>> {
  try {
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "allMids",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Convert string prices to numbers
    return Object.fromEntries(
      Object.entries(data as Record<string, string>).map(([coin, price]) => [
        coin,
        Number(price),
      ])
    );
  } catch (error) {
    console.error("Error fetching mid prices:", error);
    return {}; // Return empty object if fetch fails
  }
}

async function getCoins(): Promise<string[]> {
  try {
    const hyperliquidPerps = await db
      .select()
      .from(perpsTable)
      .where(
        and(
          eq(perpsTable.market, "Hyperliquid (Futures)"),
          eq(perpsTable.isActive, true)
        )
      );

    // Return just the indexId (coin symbols) for Hyperliquid API
    return hyperliquidPerps.map((perp) => perp.indexId);
  } catch (error: any) {
    console.error("Error fetching Hyperliquid coins:", error);
    return [];
  }
}

export async function getAllFundingRates(): Promise<MarketFundingData[]> {
  // Fetch coins from database instead of hardcoded list
  const coins = await getCoins();

  if (coins.length === 0) {
    console.warn("No Hyperliquid perps found in database");
    return [];
  }

  // Fetch prices (won't throw if it fails)
  const prices = await fetchAllMidPrices();

  const allMarketData: MarketFundingData[] = [];

  // Fetch funding rates for all markets in parallel
  const results = await Promise.allSettled(
    coins.map((coin) => fetchFundingRatesForMarket(coin))
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.length > 0) {
      const coin = coins[index];
      const latestRate = result.value[result.value.length - 1]; // Most recent

      if (!latestRate || !coin) return;

      // Hyperliquid funding rate is already hourly
      const fundingRateHourly = parseFloat(latestRate.fundingRate);

      allMarketData.push({
        protocol: "hyperliquid",
        symbol: `${coin}-PERP`,
        price: prices[coin] ?? null,
        hourlyRate: fundingRateHourly,
        projections: calculateAllTimeframes(fundingRateHourly),
        timestamp: latestRate.time,
        metadata: {
          premium: latestRate.premium,
          coin: latestRate.coin,
        },
      });
    }
  });

  return allMarketData;
}
