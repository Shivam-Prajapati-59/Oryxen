import type { Request, Response } from "express";
import { getAllFundingRatesFromDB } from "../db/fundingRateService";

export async function getAllFundingRates(req: Request, res: Response) {
  try {
    const data = await getAllFundingRatesFromDB();

    res.json({
      success: true,
      data,
      timestamp: Date.now(),
      count: data.length,
    });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch funding rates",
      timestamp: Date.now(),
    });
  }
}
