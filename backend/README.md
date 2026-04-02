# Oryxen Backend API and WebSocket Engine

The Oryxen Backend is an ultra-fast data integration layer powered by **Bun** and **Express**. It handles aggregating dynamic funding rates across decentralized exchanges and securely interfacing with the Neon Postgres database to persist critical market metrics.

It provides both a standard REST API and a robust WebSocket infrastructure for real-time frontend synchronization.

## ✨ Key Features

- **RESTful API**: Serves endpoints for polling multi-market funding rates from Drift Protocol and Hyperliquid.
- **Real-Time WebSockets**: Dispatches live data streams (funding rates, orderbook updates) to connected frontend clients at extremely low latency.
- **Data Persistence**: Uses Drizzle ORM interfacing with a Neon distributed Postgres instance.
- **Performance Focused**: Native execution on the `Bun` runtime maximizing single-threaded concurrency and sub-millisecond execution overhead.

## 🛠 Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **API Framework**: Express
- **Database & ORM**: Drizzle ORM, `@neondatabase/serverless`
- **Configuration Validation**: `dotenv`

## 📦 Installation & Setup

Ensure that `bun` is installed on your system.

1. Navigate to the backend directory and install components:

```bash
bun install
```

2. Set your environment variables in `.env`:

```env
PORT=5000
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

3. Sync Database schema using Drizzle:

```bash
bun x drizzle-kit push
```

4. Run the API Server:

```bash
bun run index.ts
```

_(The server defaults to port 5000 and mounts the WS endpoint at `/ws`)_

## 🛣️ API Routes

### General

- `GET /` - Global health configuration
- `GET /api/health` - Internal service heartbeat

### Data Feeds

- `GET /api/funding-rates` - All currently registered funding rates
- `GET /api/drift/funding-rates` - Drift specific funding intervals
- `GET /api/hyperliquid/funding-rates` - Hyperliquid API bridged funding configurations
- `GET /api/gmxsol/markets` - Retrieves all stored GMXSol trading parameters
