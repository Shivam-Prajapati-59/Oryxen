import { Router } from "express";
import { getContractsFundingRates } from "../controllers/drift.controller";

const router = Router();

router.get("/funding-rates", getContractsFundingRates);

export default router;
