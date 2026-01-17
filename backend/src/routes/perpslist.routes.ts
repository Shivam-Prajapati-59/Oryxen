import { Router } from "express";
import { getAllFundingRates } from "../controllers/perpslist.controller";

const router = Router();

router.get("/", getAllFundingRates);

export default router;
