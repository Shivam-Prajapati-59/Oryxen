import type { MarketFundingData } from "../../types/fundingRate";
import { calculateHyperliquidProjections } from "../../utils/helpers/fundingRateFormatter";

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

interface HyperliquidAssetContext {
  funding: string;
  premium: string;
  dayNtlVlm: string;
  prevDayPx: string;
  markPx: string;
  midPx?: string;
  impactPxs?: string[];
  openInterest: string;
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
  maxLeverage: number,
  timestamp: number,
  metadata: Record<string, any>,
): MarketFundingData {
  return {
    protocol: "hyperliquid",
    symbol: `${symbol}-PERP`,
    price,
    imageUrl: getTokenImageUrl(symbol),
    fundingRate: hourlyFunding,
    maxleverage: maxLeverage,
    projections: calculateHyperliquidProjections(hourlyFunding),
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
    // 1. Get Metadata and Live Asset Contexts in one call
    const liveFundingRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });

    if (!liveFundingRes.ok) {
      throw new Error(`HTTP error! status: ${liveFundingRes.status}`);
    }

    const [liveMeta, liveCtxs] = (await liveFundingRes.json()) as [
      HyperliquidMetaResponse,
      HyperliquidAssetContext[],
    ];

    // Validate response structure
    if (!liveMeta?.universe || !Array.isArray(liveMeta.universe)) {
      throw new Error("Invalid metadata structure");
    }

    if (!Array.isArray(liveCtxs)) {
      throw new Error("Invalid asset contexts structure");
    }

    // 2. Get Mid Prices
    const prices = await fetchAllMidPrices();

    // 3. Build leverage map
    const leverageMap = new Map<string, number>();
    liveMeta.universe.forEach((m) => {
      leverageMap.set(m.name, m.maxLeverage);
    });

    // 4. Transform data
    const allMarketData: MarketFundingData[] = [];

    liveMeta.universe.forEach((m, idx) => {
      const coin = m.name;
      const ctx = liveCtxs[idx];

      // Skip if context is missing
      if (!ctx) {
        console.warn(`Missing context for ${coin}`);
        return;
      }

      const price = prices[coin];
      const maxLeverage = leverageMap.get(coin) ?? 0;

      // Skip if price is missing
      if (!price || !Number.isFinite(price)) {
        console.warn(`Missing or invalid price for ${coin}`);
        return;
      }

      // Parse funding rate
      const fundingRate = parseFloat(ctx.funding);
      if (!Number.isFinite(fundingRate)) {
        console.warn(`Invalid funding rate for ${coin}: ${ctx.funding}`);
        return;
      }

      allMarketData.push(
        transformMarket(coin, price, fundingRate, maxLeverage, Date.now(), {
          coin,
          premium: ctx.premium,
          openInterest: ctx.openInterest,
          dayVolume: ctx.dayNtlVlm,
        }),
      );
    });

    console.log(`✅ Fetched ${allMarketData.length} Hyperliquid funding rates`);
    return allMarketData;
  } catch (err) {
    console.error("Failed to fetch Hyperliquid funding rates:", err);
    return [];
  }
}
