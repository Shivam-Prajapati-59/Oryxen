// backend/index.ts
import express from "express";
import driftRoutes from "./src/routes/drift.routes";
import hyperliquidRoutes from "./src/routes/hyperliquid.routes";
import perpsRoutes from "./src/routes/perps.routes";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Protocol routes
app.use("/api/drift", driftRoutes);
app.use("/api/hyperliquid", hyperliquidRoutes);
app.use("/api/perps", perpsRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Oryxen API - Multi-Protocol Funding Rates ⚡",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      drift: "/api/drift/funding-rates",
      hyperliquid: "/api/hyperliquid/funding-rates",
      perpsList: "/api/perps/list",
      perpsSync: "/api/perps/sync",
      perpsDb: "/api/perps/db",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: err.message,
    });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Drift: http://localhost:${PORT}/api/drift/funding-rates`);
  console.log(
    `📊 Hyperliquid: http://localhost:${PORT}/api/hyperliquid/funding-rates`
  );
  console.log(`📊 Perps List: http://localhost:${PORT}/api/perps/list`);
  console.log(`📊 Perps Sync: POST http://localhost:${PORT}/api/perps/sync`);
  console.log(`📊 Perps DB: http://localhost:${PORT}/api/perps/db`);
});
