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

// ─── Solana Network Selection ────────────────────────────────────────

const NETWORK_STORAGE_KEY = "oryxen_solana_network";

/** Read the user-selected Solana network from localStorage (SSR-safe). */
export function getSolanaNetwork(): "devnet" | "mainnet" {
  if (typeof window === "undefined") return "devnet";
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
  if (stored === "mainnet") return "mainnet";
  return "devnet";
}

/** Persist the user-selected Solana network and reload so module-level constants re-evaluate. */
export function setSolanaNetwork(network: "devnet" | "mainnet"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NETWORK_STORAGE_KEY, network);
  window.location.reload();
}

/** The active Solana network at module-load time. */
export const SOLANA_NETWORK = getSolanaNetwork();

/** The resolved RPC URL for the current network. */
export const SOLANA_RPC_URL =
  SOLANA_NETWORK === "mainnet" ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;

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
