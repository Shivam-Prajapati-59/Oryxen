import { db } from "./client";
import { marketFundingData } from "./schema";
import { eq, and, sql } from "drizzle-orm";
import type { MarketFundingData } from "../types/fundingRate";

/* -------------------------------------------------------------------------- */
/*                           Insert/Update Functions                          */
/* -------------------------------------------------------------------------- */

export async function upsertFundingRates(
  data: MarketFundingData[],
): Promise<void> {
  if (data.length === 0) return;

  try {
    for (const item of data) {
      await db
        .insert(marketFundingData)
        .values({
          protocol: item.protocol,
          symbol: item.symbol,
          price: item.price?.toString() ?? "0",
          imageUrl: item.imageUrl,
          fundingRate: item.fundingRate.toString(),
          projections: item.projections as any,
          metadata: item.metadata as any,
          sourceTimestamp: new Date(item.timestamp),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [marketFundingData.protocol, marketFundingData.symbol],
          set: {
            price: sql`EXCLUDED.price`,
            fundingRate: sql`EXCLUDED.funding_rate`,
            projections: sql`EXCLUDED.projections`,
            metadata: sql`EXCLUDED.metadata`,
            sourceTimestamp: sql`EXCLUDED.source_timestamp`,
            updatedAt: new Date(),
          },
        });
    }

    console.log(`✅ Upserted ${data.length} funding rates to database`);
  } catch (error) {
    console.error("❌ Error upserting funding rates:", error);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                             Query Functions                                */
/* -------------------------------------------------------------------------- */

export async function getAllFundingRatesFromDB(): Promise<MarketFundingData[]> {
  try {
    const results = await db.select().from(marketFundingData);

    return results.map((record) => ({
      protocol: record.protocol,
      symbol: record.symbol,
      price: record.price ? Number(record.price) : null,
      imageUrl: record.imageUrl ?? "",
      fundingRate: Number(record.fundingRate),
      projections: record.projections as any,
      timestamp: record.sourceTimestamp?.getTime() ?? Date.now(),
      metadata: record.metadata as any,
    }));
  } catch (error) {
    console.error("❌ Error fetching funding rates from DB:", error);
    return [];
  }
}

export async function getFundingRatesByProtocol(
  protocol: string,
): Promise<MarketFundingData[]> {
  try {
    const results = await db
      .select()
      .from(marketFundingData)
      .where(eq(marketFundingData.protocol, protocol));

    return results.map((record) => ({
      protocol: record.protocol,
      symbol: record.symbol,
      price: record.price ? Number(record.price) : null,
      imageUrl: record.imageUrl ?? "",
      fundingRate: Number(record.fundingRate),
      projections: record.projections as any,
      timestamp: record.sourceTimestamp?.getTime() ?? Date.now(),
      metadata: record.metadata as any,
    }));
  } catch (error) {
    console.error(
      `❌ Error fetching ${protocol} funding rates from DB:`,
      error,
    );
    return [];
  }
}

export async function getFundingRateBySymbol(
  protocol: string,
  symbol: string,
): Promise<MarketFundingData | null> {
  try {
    const result = await db
      .select()
      .from(marketFundingData)
      .where(
        and(
          eq(marketFundingData.protocol, protocol),
          eq(marketFundingData.symbol, symbol),
        ),
      )
      .limit(1);

    if (result.length === 0) return null;

    const record = result[0];
    if (!record) return null;

    return {
      protocol: record.protocol,
      symbol: record.symbol,
      price: record.price ? Number(record.price) : null,
      imageUrl: record.imageUrl ?? "",
      fundingRate: Number(record.fundingRate),
      projections: record.projections as any,
      timestamp: record.sourceTimestamp?.getTime() ?? Date.now(),
      metadata: record.metadata as any,
    };
  } catch (error) {
    console.error("❌ Error fetching funding rate by symbol:", error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                           Cache Management                                 */
/* -------------------------------------------------------------------------- */

export async function getLastUpdateTime(
  protocol: string,
): Promise<Date | null> {
  try {
    const result = await db
      .select({ updatedAt: marketFundingData.updatedAt })
      .from(marketFundingData)
      .where(eq(marketFundingData.protocol, protocol))
      .orderBy(sql`${marketFundingData.updatedAt} DESC`)
      .limit(1);

    return result[0]?.updatedAt ?? null;
  } catch (error) {
    console.error("❌ Error getting last update time:", error);
    return null;
  }
}

export async function clearOldRecords(daysToKeep: number = 7): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db
      .delete(marketFundingData)
      .where(sql`${marketFundingData.updatedAt} < ${cutoffDate}`);

    console.log(`✅ Cleared records older than ${daysToKeep} days`);
  } catch (error) {
    console.error("❌ Error clearing old records:", error);
  }
}
