# Oryxen Frontend

The Oryxen Frontend is a Next.js 14 web application designed to act as the ultimate aggregator and pro-trading interface for perpetual futures on Solana. It connects securely to user wallets utilizing Privy, aggregates liquidity across multiple DEXes, and provides real-time position management.

## ✨ Core Functionality

- **Trading Order Panel**: Fully custom, dynamic order placement logic with leverage sliders, limit/market toggles, and risk parameter configurations (Take Profit, Stop Loss).
- **Embedded Wallets**: Plug-and-play authentication via Privy Auth.
- **Cross-DEX Compatibility**: First-class abstractions connecting `@drift-labs/sdk-browser` and `@gmsol-labs/gmsol-sdk`.
- **Pre-trade Statistics**: Automatically evaluates margin limits, taker/maker fees, and liquidation parameters to keep traders informed prior to execution.
- **Live PnL Tracking**: Subscribes to solana-based on-chain streams to evaluate user portfolio and open margin positions.

## 🛠 Tech Stack

- **Core**: Next.js (App Router), React 19
- **Styling & UI**: Tailwind CSS v4, Radix UI (Shadcn), Motion (framer-motion)
- **State Management**: React Query, React Context
- **Web3 Libraries**:
  - `viem` / `ethers` (EVM abstractions)
  - `@solana/web3.js` & `bs58` (Solana abstractions)
  - `@privy-io/react-auth` (Authentication)
  - `@pythnetwork/client` (Oracle Market Prices)

## 📦 Installation & Setup

1. Install dependencies:

```bash
npm install
```

2. Setup Environment Variables `.env`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

3. Run the development server:

```bash
npm run dev
```

The application will launch on `http://localhost:3000`.

## 📂 Architecture

- `/src/components`: Reusable Shadcn UI modules, interactive layout shells, and trading components.
- `/src/features`: Grouped functionality logic separating `drift`, `gmxsol`, and cross-protocol adapters.
- `/src/app`: Next.js App Router entrypoints for trading pages.
