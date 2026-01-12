// backend/src/routes/perps.routes.ts
import express from "express";
import {
  getPerps,
  syncPerpsToDb,
  getPerpsFromDb,
  getPerpsFromDbByMarket,
} from "../controllers/perps.controller";

const router = express.Router();

// Get perps from CoinGecko API
router.get("/list", getPerps);

// Sync perps from CoinGecko to database
router.post("/sync", syncPerpsToDb);

// Get perps from database
router.get("/db", getPerpsFromDb);

// Get perps by market from database
router.get("/market/:market", getPerpsFromDbByMarket);

export default router;
