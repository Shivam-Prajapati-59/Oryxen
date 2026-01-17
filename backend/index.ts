import express from "express";
import routes from "./src/routes/index";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------------------------------------------------------------- */
/*                                 Middleware                                 */
/* -------------------------------------------------------------------------- */

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Oryxen Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      allFundingRates: "/api/funding-rates",
      drift: "/api/drift/funding-rates",
      hyperliquid: "/api/hyperliquid/funding-rates",
      sync: {
        all: "POST /api/sync/all",
        drift: "POST /api/sync/drift",
        hyperliquid: "POST /api/sync/hyperliquid",
      },
    },
  });
});

/* -------------------------------------------------------------------------- */
/*                              Error Handling                                */
/* -------------------------------------------------------------------------- */

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    timestamp: Date.now(),
  });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Server error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
      timestamp: Date.now(),
    });
  },
);

/* -------------------------------------------------------------------------- */
/*                                Start Server                                */
/* -------------------------------------------------------------------------- */

app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API Endpoints:`);
  console.log(`\n   📖 Read (from Database):`);
  console.log(`   - All: http://localhost:${PORT}/api/funding-rates`);
  console.log(`   - Drift: http://localhost:${PORT}/api/drift/funding-rates`);
  console.log(
    `   - Hyperliquid: http://localhost:${PORT}/api/hyperliquid/funding-rates`,
  );
  console.log(`\n   🔄 Sync (fetch & update):`);
  console.log(`   - All: POST http://localhost:${PORT}/api/sync/all`);
  console.log(`   - Drift: POST http://localhost:${PORT}/api/sync/drift`);
  console.log(
    `   - Hyperliquid: POST http://localhost:${PORT}/api/sync/hyperliquid`,
  );
  console.log(`\n   ❤️  Health: http://localhost:${PORT}/api/health\n`);
});
