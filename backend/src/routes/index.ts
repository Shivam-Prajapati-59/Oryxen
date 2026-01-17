import { Router } from "express";
import driftRoutes from "./drfit.routes";
import hyperliquidRoutes from "./hyperliquid.routes";
import perpRoutes from "./perpslist.routes";
import syncRoutes from "./sync.routes";

const router = Router();

// Mount protocol-specific routes
router.use("/drift", driftRoutes);
router.use("/hyperliquid", hyperliquidRoutes);
router.use("/funding-rates", perpRoutes);

// Sync routes
router.use("/sync", syncRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: Date.now(),
  });
});

export default router;
