import express from "express";
import { getFundingRates } from "../controllers/hyperliquid.controller";

const router = express.Router();

router.get("/funding-rates", getFundingRates);

export default router;
