// backend/src/routes/perps.routes.ts
import express from "express";
import { getPerps } from "../controllers/perps.controller";

const router = express.Router();

router.get("/list", getPerps);

export default router;
