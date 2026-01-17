import { Router } from "express";
import {
  syncAllProtocols,
  syncDrift,
  syncHyperliquid,
} from "../controllers/sync.controller";

const router = Router();

// Sync all protocols
router.post("/all", syncAllProtocols);

// Sync individual protocols
router.post("/drift", syncDrift);
router.post("/hyperliquid", syncHyperliquid);

export default router;
