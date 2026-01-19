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
    console.log(`🔄 Upserting ${data.length} funding rates...`);

    // Use a transaction for better performance and consistency
    await db.transaction(async (tx) => {
      for (const item of data) {
        await tx
          .insert(marketFundingData)
          .values({
            protocol: item.protocol,
            symbol: item.symbol,
            price: item.price?.toString() ?? "0",
            imageUrl: item.imageUrl,
            fundingRate: item.fundingRate.toString(),
            maxLeverage: item.maxleverage?.toString() ?? null,
            projections: item.projections as any,
            metadata: item.metadata as any,
            sourceTimestamp: new Date(item.timestamp),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [marketFundingData.protocol, marketFundingData.symbol],
            set: {
              price: sql`EXCLUDED.price`,
              imageUrl: sql`EXCLUDED.image_url`,
              fundingRate: sql`EXCLUDED.funding_rate`,
              maxLeverage: sql`EXCLUDED.max_leverage`,
              projections: sql`EXCLUDED.projections`,
              metadata: sql`EXCLUDED.metadata`,
              sourceTimestamp: sql`EXCLUDED.source_timestamp`,
              updatedAt: sql`EXCLUDED.updated_at`,
            },
          });
      }
    });

    console.log(`✅ Successfully upserted ${data.length} funding rates`);
  } catch (error) {
    console.error("❌ Error upserting funding rates:", error);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                       Batch Upsert (More Efficient)                        */
/* -------------------------------------------------------------------------- */

export async function batchUpsertFundingRates(
  data: MarketFundingData[],
): Promise<void> {
  if (data.length === 0) return;

  try {
    console.log(`🔄 Batch upserting ${data.length} funding rates...`);

    const values = data.map((item) => ({
      protocol: item.protocol,
      symbol: item.symbol,
      price: item.price?.toString() ?? "0",
      imageUrl: item.imageUrl,
      fundingRate: item.fundingRate.toString(),
      maxLeverage: item.maxleverage?.toString() ?? null,
      projections: item.projections as any,
      metadata: item.metadata as any,
      sourceTimestamp: new Date(item.timestamp),
      updatedAt: new Date(),
    }));

    // Insert all at once
    await db
      .insert(marketFundingData)
      .values(values)
      .onConflictDoUpdate({
        target: [marketFundingData.protocol, marketFundingData.symbol],
        set: {
          price: sql`EXCLUDED.price`,
          imageUrl: sql`EXCLUDED.image_url`,
          fundingRate: sql`EXCLUDED.funding_rate`,
          maxLeverage: sql`EXCLUDED.max_leverage`,
          projections: sql`EXCLUDED.projections`,
          metadata: sql`EXCLUDED.metadata`,
          sourceTimestamp: sql`EXCLUDED.source_timestamp`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      });

    console.log(`✅ Successfully batch upserted ${data.length} funding rates`);
  } catch (error) {
    console.error("❌ Error batch upserting funding rates:", error);
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
      maxleverage: record.maxLeverage ? Number(record.maxLeverage) : 0,
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
      maxleverage: record.maxLeverage ? Number(record.maxLeverage) : 0,
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
      maxleverage: record.maxLeverage ? Number(record.maxLeverage) : 0,
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
/*                            Stats & Management                              */
/* -------------------------------------------------------------------------- */

export async function getRecordCount(protocol?: string): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(marketFundingData)
      .where(protocol ? eq(marketFundingData.protocol, protocol) : undefined);

    return result[0]?.count ?? 0;
  } catch (error) {
    console.error("❌ Error getting record count:", error);
    return 0;
  }
}

export async function getLastUpdateTime(
  protocol?: string,
): Promise<Date | null> {
  try {
    const result = await db
      .select({ updatedAt: marketFundingData.updatedAt })
      .from(marketFundingData)
      .where(protocol ? eq(marketFundingData.protocol, protocol) : undefined)
      .orderBy(sql`${marketFundingData.updatedAt} DESC`)
      .limit(1);

    return result[0]?.updatedAt ?? null;
  } catch (error) {
    console.error("❌ Error getting last update time:", error);
    return null;
  }
}

export async function clearOldRecords(daysToKeep: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(marketFundingData)
      .where(sql`${marketFundingData.updatedAt} < ${cutoffDate}`)
      .returning({ id: marketFundingData.id });

    const deletedCount = result.length;
    console.log(
      `✅ Cleared ${deletedCount} records older than ${daysToKeep} days`,
    );

    return deletedCount;
  } catch (error) {
    console.error("❌ Error clearing old records:", error);
    return 0;
  }
}

export async function clearAllRecords(): Promise<number> {
  try {
    const result = await db
      .delete(marketFundingData)
      .returning({ id: marketFundingData.id });

    const deletedCount = result.length;
    console.log(`✅ Cleared ${deletedCount} total records`);

    return deletedCount;
  } catch (error) {
    console.error("❌ Error clearing all records:", error);
    return 0;
  }
}
