import type { Request, Response } from "express";
import { getFundingRatesByProtocol } from "../db/fundingRateService";
import { getAllFundingRates } from "../services/funding-rate/drfitFundingRate";

export async function getContractsFundingRates(req: Request, res: Response) {
  try {
    const data = await getAllFundingRates();

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
