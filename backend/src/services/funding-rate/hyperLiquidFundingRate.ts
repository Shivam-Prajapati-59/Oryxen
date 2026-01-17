import type { MarketFundingData } from "../../types/fundingRate";
import { calculateDriftProjections } from "../../utils/helpers/fundingRateFormatter";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface HyperliquidMetaResponse {
  universe: {
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
  }[];
}

interface HyperliquidFunding {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

type HyperliquidMidPrices = Record<string, string>;

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function getTokenImageUrl(symbol: string): string {
  const token = symbol.split("-")[0]?.toUpperCase() ?? symbol.toUpperCase();
  return `https://app.hyperliquid.xyz/coins/${token}.svg`;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/*                                Transformers                                */
/* -------------------------------------------------------------------------- */

function transformMarket(
  symbol: string,
  price: number,
  hourlyFunding: number,
  timestamp: number,
  metadata: Record<string, any>,
): MarketFundingData {
  return {
    protocol: "hyperliquid",
    symbol: `${symbol}-PERP`,
    price,
    imageUrl: getTokenImageUrl(symbol),
    fundingRate: hourlyFunding,
    projections: calculateDriftProjections(hourlyFunding),
    timestamp,
    metadata,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Fetchers                                 */
/* -------------------------------------------------------------------------- */

async function fetchFundingRatesForMarket(
  coin: string,
): Promise<HyperliquidFunding[]> {
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
      ]),
    );
  } catch (error) {
    console.error("Error fetching mid prices:", error);
    return {}; // Return empty object if fetch fails
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Main                                     */
/* -------------------------------------------------------------------------- */

export async function getAllFundingRates(): Promise<MarketFundingData[]> {
  const url = "https://api.hyperliquid.xyz/info";

  try {
    // 1. Get Metadata (List of all coins)
    const metaRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
    });
    const meta = (await metaRes.json()) as HyperliquidMetaResponse;
    const coins = meta.universe.map((m) => m.name);

    // 2. Get Mid Prices (Single request, no rate limit risk here)
    const prices = await fetchAllMidPrices();

    // 3. Process Funding Rates in Chunks
    const allMarketData: MarketFundingData[] = [];
    const CHUNK_SIZE = 10; // Process 10 markets at a time
    const WAIT_TIME = 2000; // Wait 500ms between chunks

    const coinChunks = chunkArray(coins, CHUNK_SIZE);

    for (const chunk of coinChunks) {
      const results = await Promise.allSettled(
        chunk.map((coin) => fetchFundingRatesForMarket(coin)),
      );

      results.forEach((result, index) => {
        const coin = chunk[index];
        if (coin && result.status === "fulfilled" && result.value.length > 0) {
          const latestRate = result.value[result.value.length - 1];
          const price = prices[coin];

          if (latestRate && price) {
            allMarketData.push(
              transformMarket(
                coin,
                price,
                parseFloat(latestRate.fundingRate),
                latestRate.time,
                {
                  premium: latestRate.premium,
                  coin: latestRate.coin,
                },
              ),
            );
          }
        }
      });
      await delay(WAIT_TIME);
    }

    console.log(`✅ Fetched ${allMarketData.length} Hyperliquid funding rates`);
    return allMarketData;
  } catch (err) {
    console.error("Failed to fetch Hyperliquid funding rates:", err);
    return [];
  }
}
