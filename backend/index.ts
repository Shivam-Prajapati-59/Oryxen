import express from "express";
import routes from "./src/routes/index";
import "dotenv/config";
import { WebSocketManager } from "./src/services/websocket/wsManager";

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------------------------------------------------------------- */
/*                                 Middleware                                 */
/* -------------------------------------------------------------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

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

app.get("/", (req, res) => {
  res.json({
    message: "Oryxen Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      allFundingRates: "/api/funding-rates",
      drift: "/api/drift/funding-rates",
      hyperliquid: "/api/hyperliquid/funding-rates",
      websocket: `ws://localhost:${PORT}/ws`,
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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    timestamp: Date.now(),
  });
});

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
/*                          Start Bun Server with Express                     */
/* -------------------------------------------------------------------------- */

const wsManager = new WebSocketManager();

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { subscribedSymbols: [] },
      });
      if (upgraded) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Convert Bun Request to Express-compatible request
    const method = req.method;
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Parse request body
    let body: any = null;
    const contentType = headers["content-type"] || "";

    if (method !== "GET" && method !== "HEAD") {
      try {
        const rawBody = await req.text();
        if (rawBody) {
          if (contentType.includes("application/json")) {
            body = JSON.parse(rawBody);
          } else {
            body = rawBody;
          }
        }
      } catch (error) {
        console.error("Error parsing request body:", error);
      }
    }

    // Create a promise to handle Express response
    return new Promise<Response>((resolve) => {
      const chunks: Buffer[] = [];

      // Mock response object
      const mockRes = {
        statusCode: 200,
        _headers: {} as Record<string, string>,
        _chunks: chunks,

        status(code: number) {
          this.statusCode = code;
          return this;
        },

        header(key: string, value: string) {
          this._headers[key.toLowerCase()] = value;
          return this;
        },

        setHeader(key: string, value: string) {
          this._headers[key.toLowerCase()] = value;
        },

        getHeader(key: string) {
          return this._headers[key.toLowerCase()];
        },

        send(data: any) {
          const body = typeof data === "string" ? data : JSON.stringify(data);
          resolve(
            new Response(body, {
              status: this.statusCode,
              headers: this._headers,
            }),
          );
        },

        json(data: any) {
          this._headers["content-type"] = "application/json";
          this.send(JSON.stringify(data));
        },

        sendStatus(code: number) {
          this.statusCode = code;
          this.send("");
        },

        end(data?: any) {
          if (data) {
            this.send(data);
          } else {
            resolve(
              new Response(null, {
                status: this.statusCode,
                headers: this._headers,
              }),
            );
          }
        },
      };

      // Mock request object
      const mockReq = {
        method,
        url: url.pathname + url.search,
        path: url.pathname,
        headers,
        body,
      };

      // Call Express app
      app(mockReq as any, mockRes as any);
    });
  },
  websocket: wsManager.handleWebSocket(),
});

console.log(`\n🚀 Server is running on http://localhost:${server.port}`);

// Start WebSocket connections
await wsManager.start();
console.log(`📡 WebSocket Manager started`);
console.log(`🔌 WebSocket endpoint: ws://localhost:${server.port}/ws`);

console.log(`📊 API Endpoints:`);
console.log(`\n   📖 Read (from Database):`);
console.log(`   - All: http://localhost:${server.port}/api/funding-rates`);
console.log(
  `   - Drift: http://localhost:${server.port}/api/drift/funding-rates`,
);
console.log(
  `   - Hyperliquid: http://localhost:${server.port}/api/hyperliquid/funding-rates`,
);
console.log(`\n   🔄 Sync (fetch & update):`);
console.log(`   - All: POST http://localhost:${server.port}/api/sync/all`);
console.log(`   - Drift: POST http://localhost:${server.port}/api/sync/drift`);
console.log(
  `   - Hyperliquid: POST http://localhost:${server.port}/api/sync/hyperliquid`,
);
console.log(`\n   ❤️  Health: http://localhost:${server.port}/api/health\n`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  wsManager.stop();
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down gracefully...");
  wsManager.stop();
  server.stop();
  process.exit(0);
});
