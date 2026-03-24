import { Router } from "express";
import { getGmxsolMarketsController } from "../controllers/gmxsol.controller";

const router = Router();

router.get("/markets", getGmxsolMarketsController);

export default router;
