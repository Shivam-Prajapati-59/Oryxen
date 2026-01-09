import express from "express";
import { getFundingRates } from "../controllers/drift.controller";

const router = express.Router();

router.get("/funding-rates", getFundingRates);

export default router;
