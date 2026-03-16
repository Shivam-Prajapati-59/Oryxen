/**
 * Enrich raw GMSOL positions with SDK-computed fields.
 *
 * Pipeline (matches the official SDK demo):
 *   1. Market.decode(rawData) → market.to_model(supply)  → MarketModel
 *   2. Position.decode(rawData) → position.to_model(marketModel) → PositionModel
 *   3. positionModel.status(prices) → PositionStatus
 *      { entry_price, pending_pnl, leverage, liquidation_price, collateral_value, ... }
 *
 * All bigint values in the SDK use 20 decimal places (MARKET_USD_UNIT = 10^20)
 * for prices/values, and 30 decimal places for position sizeInUsd.
 */

import { getSDK } from "./sdk";
import type { PositionInfo } from "./list-positions";
import type { MarketInfo } from "../types";
import type { Prices, PositionStatus } from "@gmsol-labs/gmsol-sdk";

/** 10^20 — SDK's USD precision for prices and values */
const USD_PRECISION_20 = BigInt("100000000000000000000");

/** 10^30 — position sizeInUsd precision */
const USD_PRECISION_30 = BigInt("1000000000000000000000000000000");

export interface EnrichedPosition {
  /** Original PositionInfo data */
  raw: PositionInfo;
  /** Human-readable USD size */
  sizeUsd: number;
  /** Entry price from SDK (human-readable) */
  entryPrice: number;
  /** Unrealized PnL from SDK (human-readable USD) */
  unrealizedPnl: number;
  /** Leverage from SDK (e.g. 5.0 for 5x) */
  leverage: number;
  /** Liquidation price from SDK (human-readable USD), if available */
  liquidationPrice: number | undefined;
  /** Collateral value in USD */
  collateralValueUsd: number;
  /** SDK computation succeeded */
  sdkComputed: boolean;
}

/** Convert a 20-decimal bigint to a human-readable number. */
function bigint20ToNumber(value: bigint): number {
  // Scale to 6 decimal places in BigInt domain, then divide in Number domain
  const scaled = (value * BigInt(1_000_000)) / USD_PRECISION_20;
  return Number(scaled) / 1_000_000;
}

/** Convert a 30-decimal bigint to a human-readable number. */
function bigint30ToNumber(value: bigint): number {
  const scaled = (value * BigInt(1_000_000)) / USD_PRECISION_30;
  return Number(scaled) / 1_000_000;
}

/**
 * Build SDK Prices object from a Pyth USD price.
 * The SDK expects index/long/short token prices with min+max as 20-decimal bigints.
 */
export function buildSdkPrices(
  indexPriceUsd: number,
  longPriceUsd: number,
  shortPriceUsd: number,
): Prices {
  const toSdkValue = (usd: number) => {
    // 8 decimal precision from Pyth → scale to 20 decimals
    const cents = Math.round(usd * 1e8);
    const scaled = BigInt(cents) * BigInt("1000000000000"); // 10^(20-8)
    return { min: scaled, max: scaled };
  };

  return {
    index_token: toSdkValue(indexPriceUsd),
    long_token: toSdkValue(longPriceUsd),
    short_token: toSdkValue(shortPriceUsd),
  };
}

/**
 * Enrich a single position using the SDK pipeline.
 *
 * Returns null if SDK decoding fails (caller should fall back to manual computation).
 */
export async function enrichPosition(
  positionInfo: PositionInfo,
  market: MarketInfo,
  prices: Prices,
): Promise<EnrichedPosition | null> {
  try {
    if (!market.rawAccountData || !market.marketTokenSupply) {
      return null;
    }

    const sdk = await getSDK();

    // 1. Decode market → model
    const sdkMarket = sdk.Market.decode(market.rawAccountData);
    const marketModel = sdkMarket.to_model(BigInt(market.marketTokenSupply));

    // 2. Decode position → model
    const sdkPosition = sdk.Position.decode(positionInfo.rawData);
    const positionModel = sdkPosition.to_model(marketModel);

    // 3. Get status with prices
    let status: PositionStatus;
    try {
      status = positionModel.status(prices);
    } catch (err) {
      console.warn("[enrichPosition] positionModel.status() failed:", err);
      return null;
    }

    // 4. Convert to human-readable
    const sizeRaw = BigInt(positionInfo.sizeInUsd || "0");
    const sizeUsd = bigint30ToNumber(sizeRaw);

    const entryPrice = bigint20ToNumber(status.entry_price);
    const unrealizedPnl = bigint20ToNumber(status.pending_pnl);
    const collateralValueUsd = bigint20ToNumber(status.collateral_value);

    // Leverage is returned as a raw factor (e.g. 5000000000000000000000 for 5x)
    // It's in 20-decimal format: leverage = size / collateral
    const leverage = status.leverage != null
      ? bigint20ToNumber(status.leverage)
      : collateralValueUsd > 0
        ? sizeUsd / collateralValueUsd
        : 0;

    const liquidationPrice = status.liquidation_price != null
      ? bigint20ToNumber(status.liquidation_price)
      : undefined;

    // Clean up WASM objects
    try { sdkMarket.free(); } catch { /* already freed */ }
    try { sdkPosition.free(); } catch { /* already freed */ }
    try { positionModel.free(); } catch { /* already freed */ }

    return {
      raw: positionInfo,
      sizeUsd,
      entryPrice,
      unrealizedPnl,
      leverage,
      liquidationPrice,
      collateralValueUsd,
      sdkComputed: true,
    };
  } catch (err) {
    console.warn("[enrichPosition] SDK enrichment failed:", err);
    return null;
  }
}

/**
 * Enrich all positions using the SDK pipeline, with fallback for failures.
 */
export async function enrichAllPositions(
  positions: PositionInfo[],
  markets: MarketInfo[],
  /** Map of base symbol (e.g. "SOL") → USD price from Pyth */
  pythPrices: Record<string, number>,
): Promise<EnrichedPosition[]> {
  const results: EnrichedPosition[] = [];

  for (const pos of positions) {
    const market = markets.find(
      (m) => m.marketTokenMint === pos.marketToken,
    );

    if (!market) {
      results.push(fallbackEnrich(pos, 0));
      continue;
    }

    // Derive prices from Pyth feed
    const baseSymbol = market.name?.split("/")[0]?.trim() || "";
    const indexPrice = baseSymbol ? (pythPrices[baseSymbol] ?? 0) : 0;

    if (indexPrice <= 0 || !market.rawAccountData || !market.marketTokenSupply) {
      results.push(fallbackEnrich(pos, indexPrice));
      continue;
    }

    // For long token price: if longToken == indexToken, same as index price;
    // otherwise assume it's a wrapped version (e.g. WSOL for SOL) — same price
    const longPrice = indexPrice;
    // Short token is typically USDC — price ~$1
    const shortPrice = 1.0;

    const prices = buildSdkPrices(indexPrice, longPrice, shortPrice);
    const enriched = await enrichPosition(pos, market, prices);

    if (enriched) {
      results.push(enriched);
    } else {
      results.push(fallbackEnrich(pos, indexPrice));
    }
  }

  return results;
}

/** Index-token decimals keyed by normalised base symbol. */
const INDEX_TOKEN_DECIMALS: Record<string, number> = {
  sol: 9, btc: 8, eth: 18, wbtc: 8, weth: 18,
};

/** Fallback manual computation when SDK decode fails. */
function fallbackEnrich(pos: PositionInfo, currentPrice: number): EnrichedPosition {
  const sizeRaw = BigInt(pos.sizeInUsd || "0");
  const sizeUsd = bigint30ToNumber(sizeRaw);

  const baseSymbol = "sol"; // default
  const tokDecimals = INDEX_TOKEN_DECIMALS[baseSymbol] ?? 9;

  let entryPrice = 0;
  const sizeInTokensRaw = BigInt(pos.sizeInTokens || "0");
  if (sizeInTokensRaw > BigInt(0)) {
    const PRECISION = BigInt(18);
    const scaledNum = sizeRaw * BigInt(10) ** (PRECISION + BigInt(tokDecimals));
    const scaledDen = sizeInTokensRaw * BigInt(10) ** BigInt(30);
    entryPrice = Number(scaledNum / scaledDen) / Number(BigInt(10) ** PRECISION);
  }

  let unrealizedPnl = 0;
  if (currentPrice > 0 && entryPrice > 0) {
    const tokenAmount = Number(sizeInTokensRaw) / Math.pow(10, tokDecimals);
    unrealizedPnl = pos.side === "long"
      ? tokenAmount * (currentPrice - entryPrice)
      : tokenAmount * (entryPrice - currentPrice);
  }

  const collateralRaw = BigInt(pos.collateralAmount || "0");
  const collateralTokens = Number(collateralRaw) / Math.pow(10, tokDecimals);
  const collateralUsd = collateralTokens * (currentPrice || 1);
  const leverage = collateralUsd > 0 ? sizeUsd / collateralUsd : 0;

  return {
    raw: pos,
    sizeUsd,
    entryPrice,
    unrealizedPnl,
    leverage,
    liquidationPrice: undefined,
    collateralValueUsd: collateralUsd,
    sdkComputed: false,
  };
}
