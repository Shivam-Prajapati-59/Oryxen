// backend/src/controllers/perps.controller.ts
import type { Request, Response } from "express";
import { getAllPerps } from "../protocols/perpslist/perpsList";

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
