import type { Request, Response } from "express";
import { getAllFundingRates as getDriftRates } from "../services/funding-rate/drfitFundingRate";
import { getAllFundingRates as getHyperliquidRates } from "../services/funding-rate/hyperLiquidFundingRate";
import { upsertFundingRates } from "../db/fundingRateService";
import type { MarketFundingData } from "../types/fundingRate";

/* -------------------------------------------------------------------------- */
/*                             Sync All Protocols                             */
/* -------------------------------------------------------------------------- */

export async function syncAllProtocols(req: Request, res: Response) {
  const startTime = Date.now();
  const results: Record<string, any> = {
    drift: { success: false, count: 0, error: null },
    hyperliquid: { success: false, count: 0, error: null },
  };

  try {
    console.log("🔄 Starting sync for all protocols...");

    // Fetch from both protocols in parallel
    const [driftData, hyperliquidData] = await Promise.allSettled([
      getDriftRates(),
      getHyperliquidRates(),
    ]);

    const allData: MarketFundingData[] = [];

    // Process Drift results
    if (driftData.status === "fulfilled") {
      allData.push(...driftData.value);
      results.drift.success = true;
      results.drift.count = driftData.value.length;
      console.log(`✅ Fetched ${driftData.value.length} Drift rates`);
    } else {
      results.drift.error = driftData.reason?.message ?? "Unknown error";
      console.error("❌ Drift fetch failed:", driftData.reason);
    }

    // Process Hyperliquid results
    if (hyperliquidData.status === "fulfilled") {
      allData.push(...hyperliquidData.value);
      results.hyperliquid.success = true;
      results.hyperliquid.count = hyperliquidData.value.length;
      console.log(
        `✅ Fetched ${hyperliquidData.value.length} Hyperliquid rates`,
      );
    } else {
      results.hyperliquid.error =
        hyperliquidData.reason?.message ?? "Unknown error";
      console.error("❌ Hyperliquid fetch failed:", hyperliquidData.reason);
    }

    // Save to database
    if (allData.length > 0) {
      await upsertFundingRates(allData);
      console.log(
        `✅ Synced ${allData.length} total funding rates to database`,
      );
    }

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: "Sync completed",
      results,
      totalCount: allData.length,
      duration: `${duration}ms`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Sync error:", error);
    const duration = Date.now() - startTime;

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
      results,
      duration: `${duration}ms`,
      timestamp: Date.now(),
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                          Sync Individual Protocol                          */
/* -------------------------------------------------------------------------- */

export async function syncDrift(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    console.log("🔄 Syncing Drift protocol...");

    const data = await getDriftRates();
    await upsertFundingRates(data);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      protocol: "drift",
      count: data.length,
      duration: `${duration}ms`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Drift sync error:", error);
    const duration = Date.now() - startTime;

    res.status(500).json({
      success: false,
      protocol: "drift",
      error: error instanceof Error ? error.message : "Sync failed",
      duration: `${duration}ms`,
      timestamp: Date.now(),
    });
  }
}

export async function syncHyperliquid(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    console.log("🔄 Syncing Hyperliquid protocol...");

    const data = await getHyperliquidRates();
    await upsertFundingRates(data);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      protocol: "hyperliquid",
      count: data.length,
      duration: `${duration}ms`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("❌ Hyperliquid sync error:", error);
    const duration = Date.now() - startTime;

    res.status(500).json({
      success: false,
      protocol: "hyperliquid",
      error: error instanceof Error ? error.message : "Sync failed",
      duration: `${duration}ms`,
      timestamp: Date.now(),
    });
  }
}
