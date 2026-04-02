# Oryxen - Decentralized Trading Interface & Aggregator

Oryxen is a high-performance decentralized exchange (DEX) frontend and backend supporting continuous perps trading directly on the Solana blockchain. Integrating with major decentralized liquidity protocols including Drift V2, Hyperliquid, and GMXSol, Oryxen offers an elite trading experience directly from your wallet with aggregated liquidity, deeply synchronized funding rates, and a sleek user interface.

## 🚀 Features

- **Multi-Protocol Trading**: Access and place trades seamlessly across Drift V2, Hyperliquid, and GMXSol from one streamlined interface.
- **Embedded Wallets**: Effortless onboarding using Privy embedded wallets.
- **Live Market Data**: Synchronized multi-protocol oracle funding rates and live price streaming through Pyth Network & internal WebSocket infrastructure.
- **Advanced Order Types**: Support for limit, market, post-only, and reduce-only configurations with integrated take-profit/stop-loss logic.
- **Performant Tech Stack**: Next.js (Frontend) + Bun/Express (Backend API).

## 📂 Project Structure

Oryxen is structured as a monorepo containing two main components:

- **[`/frontend`](./frontend)**: The Next.js client delivering the user interface. Powered by React, Tailwind CSS, Shadcn UI, and Solana Web3 libraries.
- **[`/backend`](./backend)**: The Bun + Express API and WebSocket server handling real-time data sync, Drizzle ORM queries, and cross-market analytics.

## 🛠️ Tech Stack Overview

### Frontend
- **Framework**: Next.js 14, React 19
- **Styling**: Tailwind CSS, Shadcn UI, Motion
- **Web3**: `@solana/web3.js`, `@coral-xyz/anchor`, Pyth Network, Privy Auth
- **DEX SDKs**: `@drift-labs/sdk-browser`, `@gmsol-labs/gmsol-sdk`

### Backend
- **Runtime**: Bun
- **Framework**: Express API + WebSockets
- **Database**: PostgreSQL (Neon Database) + Drizzle ORM

## 🏁 Quickstart

To run the full stack locally, ensure you have Node.js and [Bun](https://bun.sh/) installed.

### 1. Install Dependencies
```bash
# In the frontend directory
cd frontend
npm install

# In the backend directory
cd ../backend
bun install
```

### 2. Environment Setup
Rename the `.env.example` to `.env` in both the `frontend` and `backend` directories and supply your environment variables (Neon Database URI, Privy API Keys, etc.).

### 3. Run Development Servers
Start both servers simultaneously in separate terminals:

```bash
# Start Backend on localhost:5000
cd backend
bun run index.ts

# Start Frontend on localhost:3000
cd frontend
npm run dev
```
