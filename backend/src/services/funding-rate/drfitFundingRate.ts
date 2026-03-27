import type { MarketFundingData } from "../../types/fundingRate";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface DriftMarketSummary {
  symbol: string;
  marketIndex?: number;
  marketType?: string;
  baseAsset?: string;
  quoteAsset?: string;
  limits?: {
    leverage?: {
      min?: number;
      max?: number;
    };
  };
  oraclePrice?: string;
  markPrice?: string;
  price?: string;
  quoteVolume?: string;
  fundingRate?: {
    long?: string;
    short?: string;
  };
  fundingRate24h?: string;
  fundingRateUpdateTs?: number;
  openInterest?: {
    long?: string;
    short?: string;
  };
  priceHigh?: {
    oracle?: string;
    fill?: string;
  };
  priceLow?: {
    oracle?: string;
    fill?: string;
  };
}

interface DriftMarketsResponse {
  success?: boolean;
  markets: DriftMarketSummary[];
}

interface DriftFundingRatesMarket {
  marketIndex: number;
  symbol: string;
  fundingRates: {
    "24h"?: string;
    "7d"?: string;
    "30d"?: string;
    "1y"?: string;
  };
}

interface DriftFundingRatesResponse {
  success?: boolean;
  markets: DriftFundingRatesMarket[];
}

/* -------------------------------------------------------------------------- */
/*                                 Validators                                 */
/* -------------------------------------------------------------------------- */

function isValidPerpMarket(market: DriftMarketSummary): boolean {
  return Boolean(market.symbol && market.marketType?.toLowerCase() === "perp");
}

function parseNumber(
  value: string | undefined,
  label: string,
  symbol: string,
): number | null {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    console.warn(`Invalid ${label} for ${symbol}:`, value);
    return null;
  }
  return parsed;
}

/* -------------------------------------------------------------------------- */
/*                                Transformers                                */
/* -------------------------------------------------------------------------- */

function getTokenImageUrl(tickerId: string): string {
  const symbol =
    tickerId.split("-")[0]?.toLowerCase() ?? tickerId.toLowerCase();
  return `https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/${symbol}.svg`;
}

function parseOpenInterestTotal(
  openInterest: DriftMarketSummary["openInterest"],
): string {
  const long = Number(openInterest?.long ?? 0);
  const short = Number(openInterest?.short ?? 0);

  if (!Number.isFinite(long) || !Number.isFinite(short)) {
    return "0";
  }

  // Drift exposes long/short side OI separately; using max side avoids double-counting.
  return Math.max(Math.abs(long), Math.abs(short)).toString();
}

function getCurrentFundingRate(market: DriftMarketSummary): number | null {
  const symbol = market.symbol.toUpperCase();
  const longRate = parseNumber(
    market.fundingRate?.long,
    "fundingRate.long",
    symbol,
  );
  if (longRate !== null) return longRate;

  return null;
}

function getDriftLongShortFundingRates(market: DriftMarketSummary): {
  long: number | null;
  short: number | null;
} {
  const symbol = market.symbol.toUpperCase();
  return {
    long: parseNumber(market.fundingRate?.long, "fundingRate.long", symbol),
    short: parseNumber(market.fundingRate?.short, "fundingRate.short", symbol),
  };
}

function transformMarket(
  market: DriftMarketSummary,
  fundingRatesBySymbol: Map<string, DriftFundingRatesMarket>,
  fundingRatesByIndex: Map<number, DriftFundingRatesMarket>,
): MarketFundingData | null {
  if (!isValidPerpMarket(market)) return null;

  const symbol = market.symbol.toUpperCase();
  const sideRates = getDriftLongShortFundingRates(market);
  const currentFundingRate = getCurrentFundingRate(market);
  const price =
    parseNumber(market.price, "price", symbol) ??
    parseNumber(market.markPrice, "markPrice", symbol) ??
    parseNumber(market.oraclePrice, "oraclePrice", symbol);

  if (
    currentFundingRate === null ||
    price === null ||
    Math.abs(price) < 1e-10
  ) {
    return null;
  }

  const fundingStats =
    (market.marketIndex !== undefined
      ? fundingRatesByIndex.get(market.marketIndex)
      : undefined) ?? fundingRatesBySymbol.get(symbol);

  const d1 = parseNumber(
    fundingStats?.fundingRates?.["24h"],
    "fundingRates.24h",
    symbol,
  );
  const d7 = parseNumber(
    fundingStats?.fundingRates?.["7d"],
    "fundingRates.7d",
    symbol,
  );
  const d30 = parseNumber(
    fundingStats?.fundingRates?.["30d"],
    "fundingRates.30d",
    symbol,
  );

  // Return only fully-aligned records from Drift sources.
  if (d1 === null || d7 === null || d30 === null) {
    return null;
  }

  const projections = {
    current: currentFundingRate,
    h4: currentFundingRate * 4,
    h8: currentFundingRate * 8,
    h12: currentFundingRate * 12,
    d1,
    d7,
    d30,
    apr: d1 * 365,
  };

  const maxLeverage = market.limits?.leverage?.max ?? 0;

  return {
    protocol: "drift",
    symbol,
    price,
    imageUrl: getTokenImageUrl(symbol),
    fundingRate: currentFundingRate,
    maxleverage: maxLeverage,
    projections,
    timestamp: Date.now(),
    metadata: {
      contractIndex: market.marketIndex,
      baseCurrency: market.baseAsset,
      quoteCurrency: market.quoteAsset,
      openInterest: parseOpenInterestTotal(market.openInterest),
      indexPrice: market.oraclePrice,
      nextFundingRate: market.fundingRate?.long,
      nextFundingRateTimestamp: market.fundingRateUpdateTs,
      high24h: market.priceHigh?.oracle ?? market.priceHigh?.fill,
      low24h: market.priceLow?.oracle ?? market.priceLow?.fill,
      volume24h: market.quoteVolume,
      driftRates: {
        longHourly: sideRates.long,
        shortHourly: sideRates.short,
      },
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Fetcher                                  */
/* -------------------------------------------------------------------------- */

export async function getAllFundingRates(): Promise<MarketFundingData[]> {
  const marketsUrl = "https://data.api.drift.trade/stats/markets";
  const fundingRatesUrl = "https://data.api.drift.trade/stats/fundingRates";

  try {
    const [marketsRes, fundingRatesRes] = await Promise.all([
      fetch(marketsUrl),
      fetch(fundingRatesUrl),
    ]);

    if (!marketsRes.ok)
      throw new Error(`HTTP ${marketsRes.status} (stats/markets)`);

    const marketsData = (await marketsRes.json()) as DriftMarketsResponse;
    if (!marketsData.markets || !Array.isArray(marketsData.markets)) {
      console.warn("No markets found in Drift stats response");
      return [];
    }

    let fundingRatesMap = new Map<string, DriftFundingRatesMarket>();
    let fundingRatesByIndex = new Map<number, DriftFundingRatesMarket>();

    if (fundingRatesRes.ok) {
      const fundingRatesData =
        (await fundingRatesRes.json()) as DriftFundingRatesResponse;

      if (Array.isArray(fundingRatesData.markets)) {
        fundingRatesMap = new Map(
          fundingRatesData.markets.map((item) => [
            item.symbol.toUpperCase(),
            item,
          ]),
        );
        fundingRatesByIndex = new Map(
          fundingRatesData.markets.map((item) => [item.marketIndex, item]),
        );
      }
    } else {
      console.warn(
        `Failed to fetch Drift funding aggregates (stats/fundingRates): HTTP ${fundingRatesRes.status}`,
      );
    }

    const results = marketsData.markets
      .map((market) =>
        transformMarket(market, fundingRatesMap, fundingRatesByIndex),
      )
      .filter((v): v is MarketFundingData => v !== null);

    console.log(`✅ Fetched ${results.length} Drift funding rates`);
    return results;
  } catch (err) {
    console.error("Failed to fetch Drift funding rates:", err);
    return [];
  }
}
