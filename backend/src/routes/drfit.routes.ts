import { Router } from "express";
import { getContractsFundingRates } from "../controllers/drfit.controller";

const router = Router();

router.get("/funding-rates", getContractsFundingRates);

export default router;
