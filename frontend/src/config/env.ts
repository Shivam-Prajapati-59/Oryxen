/**
 * Centralised environment configuration.
 *
 * Every env var the frontend needs is read here once and exported
 * as a typed constant. This avoids scattered `process.env.*` reads,
 * inconsistent fallbacks, and makes it easy to add validation later.
 */

// ─── Backend API ─────────────────────────────────────────────────────

/** Base URL for the Oryxen backend API. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Solana RPCs ─────────────────────────────────────────────────────

/** Mainnet RPC used by Jupiter Perps and other mainnet-only protocols. */
export const SOLANA_MAINNET_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

/** Devnet RPC for Flash, Drift (devnet), etc. */
export const SOLANA_DEVNET_RPC =
  process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC || "https://api.devnet.solana.com";

// ─── WebSocket ───────────────────────────────────────────────────────

/** WebSocket URL for real-time price feeds from the backend. */
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000/ws";

// ─── Privy ───────────────────────────────────────────────────────────

/** Privy application ID. */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

// ─── Pacifica ────────────────────────────────────────────────────────

/** Pacifica REST API base. */
export const PACIFICA_API_URL =
  process.env.NEXT_PUBLIC_PACIFICA_API_URL ||
  "https://test-api.pacifica.fi/api/v1";

// ─── Hyperliquid ─────────────────────────────────────────────────────

/** Whether to target the Hyperliquid testnet. */
export const HYPERLIQUID_IS_TESTNET =
  process.env.NEXT_PUBLIC_HYPERLIQUID_IS_TESTNET === "true";
