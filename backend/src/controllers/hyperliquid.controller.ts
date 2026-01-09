import type { Request, Response } from "express";
import { getAllFundingRates } from "../protocols/hyperliquid/fundingRate";
import { formatProjections } from "../utils/fundingRate";

export async function getFundingRates(req: Request, res: Response) {
  try {
    const data = await getAllFundingRates();

    // Replace raw projections with formatted projections
    const formattedData = data.map((item) => {
      const { projections, ...rest } = item;
      return {
        ...rest,
        projections: formatProjections(projections),
      };
    });

    res.json({
      success: true,
      data: formattedData,
      timestamp: Date.now(),
      count: data.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch funding rates",
    });
  }
}
