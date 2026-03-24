import type { Request, Response } from "express";
import { getGmxsolMarkets } from "../services/gmxsol/gmxsolMarketService";

export async function getGmxsolMarketsController(req: Request, res: Response) {
  try {
    const forceRefresh = req.query.refresh === "true";
    const data = await getGmxsolMarkets(forceRefresh);

    res.json({
      success: true,
      data,
      timestamp: Date.now(),
      count: data.length,
      source: "gmxsol-ws",
    });
  } catch (error) {
    console.error("GMXSol controller error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch GMXSol markets",
      timestamp: Date.now(),
    });
  }
}
