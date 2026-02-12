/**
 * Pacifica — Environment constants.
 */

import { PACIFICA_API_URL as ENV_PACIFICA_API_URL } from "@/config/env";

export const PACIFICA_API_URL = ENV_PACIFICA_API_URL;

/** Available symbols for trading on Pacifica */
export const PACIFICA_SYMBOLS = [
  { symbol: "BTC", label: "Bitcoin" },
  { symbol: "ETH", label: "Ethereum" },
  { symbol: "SOL", label: "Solana" },
] as const;

export type PacificaSymbol = (typeof PACIFICA_SYMBOLS)[number]["symbol"];
