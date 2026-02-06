// adapters/pacifica.ts
// Pacifica protocol adapter — configuration & constants

const Testnet_URL = "https://test-api.pacifica.fi/api/v1";
const Mainnet_URL = "https://api.pacifica.fi/api/v1";

export const PACIFICA_API_URL =
  process.env.NEXT_PUBLIC_PACIFICA_API_URL || Testnet_URL;

// Available symbols for trading on Pacifica
export const PACIFICA_SYMBOLS = [
  { symbol: "BTC", label: "Bitcoin" },
  { symbol: "ETH", label: "Ethereum" },
  { symbol: "SOL", label: "Solana" },
] as const;

export type PacificaSymbol = (typeof PACIFICA_SYMBOLS)[number]["symbol"];
