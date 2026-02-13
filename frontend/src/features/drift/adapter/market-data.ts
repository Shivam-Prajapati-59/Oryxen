// Drift — Market data queries.

import {
  DriftClient,
  convertToNumber,
  PRICE_PRECISION,
  QUOTE_PRECISION,
  BASE_PRECISION,
  FUNDING_RATE_PRECISION,
  calculateBidAskPrice,
} from "@drift-labs/sdk-browser";
import { bnToPrice, bnToBase, bnToFundingRate } from "./utils";

export interface PerpMarketInfo {
  oraclePrice: number;
  markPriceTwap: number;
  bidPrice: number;
  askPrice: number;
  /** Last hourly funding rate (decimal, e.g. 0.0001 = 0.01%). */
  fundingRateHourly: number;
  /** 8-hour projected rate. */
  fundingRate8h: number;
  /** Annualised rate. */
  fundingRateAnnualised: number;
  /** Open interest long in base units. */
  openInterestLong: number;
  /** Open interest short in base units. */
  openInterestShort: number;
}

/**
 * Get the oracle price for a perp market in human-readable USD.
 */
export function getOraclePrice(
  client: DriftClient,
  marketIndex: number,
): number | null {
  const oracleData = client.getOracleDataForPerpMarket(marketIndex);
  if (!oracleData) return null;
  const oraclePrice = bnToPrice(oracleData.price);
  if (!oracleData) return null;
  return bnToPrice(oracleData.price);
}

/**
 * Get comprehensive perp market information with no hardcoded values.
 */
export function getPerpMarketInfo(
  client: DriftClient,
  marketIndex: number,
): PerpMarketInfo | null {
  const market = client.getPerpMarketAccount(marketIndex);
  if (!market) return null;

  const oracleData = client.getOracleDataForPerpMarket(marketIndex);
  const oraclePrice = bnToPrice(oracleData.price);

  // Bid / ask from AMM — calculateBidAskPrice requires MMOraclePriceData
  let bidPrice = oraclePrice;
  let askPrice = oraclePrice;
  try {
    const mmOracleData = client.getMMOracleDataForPerpMarket(marketIndex);
    const [bid, ask] = calculateBidAskPrice(market.amm, mmOracleData);
    bidPrice = bnToPrice(bid);
    askPrice = bnToPrice(ask);
  } catch {
    // fallback to oracle
  }

  // Mark price TWAP
  const markPriceTwap = market.amm?.lastMarkPriceTwap
    ? bnToPrice(market.amm.lastMarkPriceTwap)
    : oraclePrice;

  // Funding — lastFundingRate is per-hour, in FUNDING_RATE_PRECISION
  const fundingRateHourly = market.amm?.lastFundingRate
    ? bnToFundingRate(market.amm.lastFundingRate)
    : 0;

  const fundingRate8h = fundingRateHourly * 8;
  const fundingRateAnnualised = fundingRateHourly * 24 * 365;

  // Open interest
  const openInterestLong = market.amm?.baseAssetAmountLong
    ? bnToBase(market.amm.baseAssetAmountLong.abs())
    : 0;
  const openInterestShort = market.amm?.baseAssetAmountShort
    ? bnToBase(market.amm.baseAssetAmountShort.abs())
    : 0;

  return {
    oraclePrice,
    markPriceTwap,
    bidPrice,
    askPrice,
    fundingRateHourly,
    fundingRate8h,
    fundingRateAnnualised,
    openInterestLong,
    openInterestShort,
  };
}
