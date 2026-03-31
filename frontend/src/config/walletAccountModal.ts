import { CHAIN_ICONS } from "@/constants/chains";

export const ETHEREUM_RPC_URL =
  process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ||
  "https://ethereum-rpc.publicnode.com";

export const ETHEREUM_USDC_ADDRESS =
  "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

export const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
] as const;

const TOKEN_LABELS: Record<string, string> = {
  solana: "SOL",
  ethereum: "USDC",
};

const TOKEN_ICONS: Record<string, string> = {
  SOL: CHAIN_ICONS.solana,
  USDC: "https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/usdc.svg",
};

const NETWORK_LABELS: Record<string, string> = {
  solana: "Solana",
  ethereum: "Base",
};

const NETWORK_ICONS: Record<string, string> = {
  solana: CHAIN_ICONS.solana,
  ethereum: CHAIN_ICONS.base,
};

export const getWalletTokenLabel = (chainType?: string) => {
  const normalized = chainType?.toLowerCase() ?? "";
  return TOKEN_LABELS[normalized] || "";
};

export const getWalletTokenIcon = (chainType?: string) => {
  const tokenLabel = getWalletTokenLabel(chainType);
  return TOKEN_ICONS[tokenLabel] || CHAIN_ICONS.ethereum;
};

export const getWalletNetworkLabel = (chainType?: string) => {
  const normalized = chainType?.toLowerCase() ?? "";
  return NETWORK_LABELS[normalized] || chainType || "Unknown";
};

export const getWalletNetworkIcon = (chainType?: string) => {
  const normalized = chainType?.toLowerCase() ?? "";
  return NETWORK_ICONS[normalized] || CHAIN_ICONS.ethereum;
};
