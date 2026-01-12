// backend/src/db/perps.service.ts
import { db } from "./client";
import { perpsTable } from "./schema";
import { eq, and } from "drizzle-orm";

export interface PerpMetadata {
  symbol: string;
  indexId: string;
  market: string;
  contractType: string;
  imageUrl: string | null;
}

export async function upsertPerp(perpData: PerpMetadata) {
  try {
    const existing = await db
      .select()
      .from(perpsTable)
      .where(
        and(
          eq(perpsTable.symbol, perpData.symbol),
          eq(perpsTable.market, perpData.market)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(perpsTable)
        .set({
          imageUrl: perpData.imageUrl,
          updatedAt: new Date(),
          lastFetchedAt: new Date(),
        })
        .where(eq(perpsTable.id, existing[0]!.id))
        .returning();

      return updated[0];
    } else {
      const inserted = await db
        .insert(perpsTable)
        .values({
          symbol: perpData.symbol,
          indexId: perpData.indexId,
          market: perpData.market,
          contractType: perpData.contractType,
          imageUrl: perpData.imageUrl,
          lastFetchedAt: new Date(),
        })
        .returning();

      return inserted[0];
    }
  } catch (error) {
    console.error("Error upserting perp:", error);
    throw error;
  }
}

export async function bulkUpsertPerps(perpsData: PerpMetadata[]) {
  const results = [];
  const errors = [];

  for (const perp of perpsData) {
    try {
      const result = await upsertPerp(perp);
      results.push(result);
    } catch (error) {
      errors.push({ perp, error });
    }
  }

  return {
    success: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

export async function getAllPerpsFromDb() {
  try {
    const perps = await db
      .select()
      .from(perpsTable)
      .where(eq(perpsTable.isActive, true))
      .orderBy(perpsTable.symbol);

    return perps;
  } catch (error) {
    console.error("Error fetching perps from DB:", error);
    throw error;
  }
}

export async function getPerpsByMarket(market: string) {
  try {
    const perps = await db
      .select()
      .from(perpsTable)
      .where(and(eq(perpsTable.market, market), eq(perpsTable.isActive, true)))
      .orderBy(perpsTable.symbol);

    return perps;
  } catch (error) {
    console.error("Error fetching perps by market:", error);
    throw error;
  }
}

export async function deactivatePerp(id: number) {
  try {
    const updated = await db
      .update(perpsTable)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(perpsTable.id, id))
      .returning();

    return updated[0];
  } catch (error) {
    console.error("Error deactivating perp:", error);
    throw error;
  }
}
