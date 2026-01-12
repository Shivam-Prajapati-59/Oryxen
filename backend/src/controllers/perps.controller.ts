// backend/src/controllers/perps.controller.ts
import type { Request, Response } from "express";
import { getAllPerps } from "../protocols/perpslist/perpsList";
import {
  bulkUpsertPerps,
  getAllPerpsFromDb,
  getPerpsByMarket,
  type PerpMetadata,
} from "../db/perps.service";

/**
 * GET /api/perps/list - Get perps from API
 */
export async function getPerps(req: Request, res: Response) {
  try {
    const perps = await getAllPerps();

    res.json({
      success: true,
      data: perps,
      timestamp: Date.now(),
      count: perps.length,
    });
  } catch (error) {
    console.error("Perps controller error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch perpetuals list",
      timestamp: Date.now(),
    });
  }
}

/**
 * POST /api/perps/sync - Fetch from CoinGecko and sync to database
 */
export async function syncPerpsToDb(req: Request, res: Response) {
  try {
    // Fetch from CoinGecko
    const perpsData = await getAllPerps();

    // Transform to DB format
    const dbPerps: PerpMetadata[] = perpsData.map((perp) => ({
      symbol: perp.name,
      indexId: perp.baseAsset,
      market: perp.protocol,
      contractType: "perpetual",
      imageUrl: perp.imageUrl,
    }));

    // Bulk upsert to database
    const result = await bulkUpsertPerps(dbPerps);

    res.json({
      success: true,
      message: "Perps synced to database",
      data: {
        totalFetched: perpsData.length,
        successfullyInserted: result.success,
        failed: result.failed,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Sync perps error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to sync perps to DB",
      timestamp: Date.now(),
    });
  }
}

/**
 * GET /api/perps/db - Get all perps from database
 */
export async function getPerpsFromDb(req: Request, res: Response) {
  try {
    const perps = await getAllPerpsFromDb();

    res.json({
      success: true,
      data: perps,
      timestamp: Date.now(),
      count: perps.length,
    });
  } catch (error) {
    console.error("Get perps from DB error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch perps from database",
      timestamp: Date.now(),
    });
  }
}

/**
 * GET /api/perps/market/:market - Get perps by market
 */
export async function getPerpsFromDbByMarket(req: Request, res: Response) {
  try {
    const { market } = req.params;
    
    if (!market) {
      res.status(400).json({
        success: false,
        error: "Market parameter is required",
        timestamp: Date.now(),
      });
      return;
    }
    
    const perps = await getPerpsByMarket(market);

    res.json({
      success: true,
      data: perps,
      timestamp: Date.now(),
      count: perps.length,
      market,
    });
  } catch (error) {
    console.error("Get perps by market error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch perps by market",
      timestamp: Date.now(),
    });
  }
}
