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
  contracts: DriftContract[];
}

interface DriftMarketStats {
  marketIndex: number;
  symbol: string;
  marginRatioInitial: number;
  marginRatioMaintenance: number;
  maxLeverage?: number;
}

interface DriftStatsResponse {
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

  const fundingRate = parseNumber(
    contract.funding_rate,
    "funding rate",
    contract.ticker_id,
  );
  const price = parseNumber(contract.last_price, "price", contract.ticker_id);

  if (fundingRate === null || price === null || Math.abs(price) < 1e-10) {
    return null;
  }

  const maxLeverage = maxLeverageMap.get(contract.ticker_id) || 0;

  return {
    protocol: "drift",
    symbol: contract.ticker_id,
    price,
    imageUrl: getTokenImageUrl(contract.ticker_id),
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

    if (!Array.isArray(data.markets)) {
      console.warn("Invalid markets data structure");
      return leverageMap;
    }

    // Build map of symbol to max leverage
    for (const market of data.markets) {
      if (market.symbol && market.marginRatioInitial) {
        // Calculate max leverage from margin ratio
        // Max Leverage = 1 / Initial Margin Ratio
        const maxLeverage = Math.floor(1 / market.marginRatioInitial);
        leverageMap.set(market.symbol, maxLeverage);
      }
    }

    console.log(
      `✅ Fetched max leverage for ${leverageMap.size} Drift markets`,
    );
    return leverageMap;
  } catch (err) {
    console.error("Failed to fetch max leverage:", err);
    return leverageMap;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Fetcher                                  */
/* -------------------------------------------------------------------------- */

export async function getAllFundingRates(): Promise<MarketFundingData[]> {
  const url = "https://data.api.drift.trade/contracts";

  try {
    // Fetch both contracts and max leverage in parallel
    const [contractsRes, maxLeverageMap] = await Promise.all([
      fetch(url),
      getMaxLeverageMap(),
    ]);

    if (!contractsRes.ok) throw new Error(`HTTP ${contractsRes.status}`);

    const data = (await contractsRes.json()) as DriftApiResponse;
    if (!Array.isArray(data.contracts)) return [];

    return data.contracts
      .map((contract) => transformContract(contract, maxLeverageMap))
      .filter((v): v is MarketFundingData => v !== null);
  } catch (err) {
    console.error("Failed to fetch Drift funding rates:", err);
    return [];
  }
}
