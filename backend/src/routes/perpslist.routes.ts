import { Router } from "express";
import {
  getAllFundingRates,
  getFilteredPerpsList,
} from "../controllers/perpslist.controller";

const router = Router();

// GET /api/funding-rates - Get all funding rates from database
router.get("/", getAllFundingRates);

// GET /api/unique-perps - Get unique perps (one per symbol)
router.get("/unique", getFilteredPerpsList);

export default router;
