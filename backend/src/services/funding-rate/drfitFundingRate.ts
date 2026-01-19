import type { MarketFundingData } from "../../types/fundingRate";
import { calculateDriftProjections } from "../../utils/helpers/fundingRateFormatter";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface DriftContract {
  ticker_id: string;
  funding_rate: string;
  last_price: string;
  contract_index?: number;
  base_currency?: string;
  quote_currency?: string;
  open_interest?: string;
  index_price?: string;
  next_funding_rate?: string;
  next_funding_rate_timestamp?: number;
  high?: string;
  low?: string;
  quote_volume?: string;
}

interface DriftApiResponse {
  success?: boolean;
  contracts: DriftContract[];
}

interface DriftMarketStats {
  symbol: string;
  marketIndex: number;
  marketType: string;
  limits: {
    leverage: {
      min: number;
      max: number;
    };
  };
  marginRatioInitial?: number; // Fallback
}

interface DriftStatsResponse {
  success?: boolean;
  markets: DriftMarketStats[];
}

/* -------------------------------------------------------------------------- */
/*                                 Validators                                 */
/* -------------------------------------------------------------------------- */

function isValidContract(contract: DriftContract): boolean {
  return Boolean(
    contract.ticker_id &&
    contract.funding_rate !== undefined &&
    contract.last_price,
  );
}

function parseNumber(
  value: string,
  label: string,
  ticker: string,
): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    console.warn(`Invalid ${label} for ${ticker}:`, value);
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

function transformContract(
  contract: DriftContract,
  maxLeverageMap: Map<string, number>,
): MarketFundingData | null {
  if (!isValidContract(contract)) return null;

  const ticker = contract.ticker_id.toUpperCase();
  const fundingRate = parseNumber(
    contract.funding_rate,
    "funding rate",
    ticker,
  );
  const price = parseNumber(contract.last_price, "price", ticker);

  if (fundingRate === null || price === null || Math.abs(price) < 1e-10) {
    return null;
  }

  // Attempt to get leverage using the full ticker (e.g., SOL-PERP)
  const maxLeverage = maxLeverageMap.get(ticker) || 0;

  return {
    protocol: "drift",
    symbol: ticker,
    price,
    imageUrl: getTokenImageUrl(ticker),
    fundingRate,
    maxleverage: maxLeverage,
    projections: calculateDriftProjections(fundingRate),
    timestamp: Date.now(),
    metadata: {
      contractIndex: contract.contract_index,
      baseCurrency: contract.base_currency,
      quoteCurrency: contract.quote_currency,
      openInterest: contract.open_interest,
      indexPrice: contract.index_price,
      nextFundingRate: contract.next_funding_rate,
      nextFundingRateTimestamp: contract.next_funding_rate_timestamp,
      high24h: contract.high,
      low24h: contract.low,
      volume24h: contract.quote_volume,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                            Max Leverage Fetcher                            */
/* -------------------------------------------------------------------------- */

async function getMaxLeverageMap(): Promise<Map<string, number>> {
  const url = "https://data.api.drift.trade/stats/markets";
  const leverageMap = new Map<string, number>();

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as DriftStatsResponse;

    if (!data.markets || !Array.isArray(data.markets)) {
      console.warn("Invalid markets data structure from Drift stats");
      return leverageMap;
    }

    for (const market of data.markets) {
      if (!market.symbol) continue;

      const symbol = market.symbol.toUpperCase();
      let maxLeverage = 0;

      // 1. Primary: Use the explicit limits field from your JSON
      if (market.limits?.leverage?.max) {
        maxLeverage = market.limits.leverage.max;
      }
      // 2. Fallback: Calculate from initial margin ratio if limits are missing
      else if (market.marginRatioInitial && market.marginRatioInitial > 0) {
        // Handle potential scaling (e.g., 500 for 5%)
        const ratio =
          market.marginRatioInitial > 1
            ? market.marginRatioInitial / 10000
            : market.marginRatioInitial;
        maxLeverage = Math.floor(1 / ratio);
      }

      if (maxLeverage > 0) {
        leverageMap.set(symbol, maxLeverage);
      }
    }

    console.log(
      `✅ Fetched max leverage for ${leverageMap.size} Drift markets`,
    );
    return leverageMap;
  } catch (err) {
    console.error("Failed to fetch Drift max leverage:", err);
    return leverageMap;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Fetcher                                  */
/* -------------------------------------------------------------------------- */

export async function getAllFundingRates(): Promise<MarketFundingData[]> {
  const url = "https://data.api.drift.trade/contracts";

  try {
    // Fetch both contracts and leverage stats in parallel
    const [contractsRes, maxLeverageMap] = await Promise.all([
      fetch(url),
      getMaxLeverageMap(),
    ]);

    if (!contractsRes.ok) throw new Error(`HTTP ${contractsRes.status}`);

    const data = (await contractsRes.json()) as DriftApiResponse;

    if (!data.contracts || !Array.isArray(data.contracts)) {
      console.warn("No contracts found in Drift response");
      return [];
    }

    const results = data.contracts
      .map((contract) => transformContract(contract, maxLeverageMap))
      .filter((v): v is MarketFundingData => v !== null);

    console.log(`✅ Fetched ${results.length} Drift funding rates`);
    return results;
  } catch (err) {
    console.error("Failed to fetch Drift funding rates:", err);
    return [];
  }
}
