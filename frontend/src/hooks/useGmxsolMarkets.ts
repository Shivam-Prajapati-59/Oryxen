"use client";

import { useQuery } from "@tanstack/react-query";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  PerpFundingRate,
  PerpFundingMetadata,
  FundingProjections,
} from "@/hooks/useFundingRates";
import { IDL } from "@/lib/idl/gmxsol/gmsol-store-idl";
import { GmsolStore } from "@/lib/idl/gmxsol/gmsol_store_type";
import { GMSOL_RPC_URL } from "@/features/gmxsol/constants";
import { listMarkets } from "@/features/gmxsol/adapter/list-markets";

// Token symbol → image URL mapping for well-known tokens
const TOKEN_IMAGES: Record<string, string> = {
  SOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  BTC: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E/logo.png",
  ETH: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png",
  USDC: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
};

function getTokenImageFromMint(mint?: string): string {
  if (!mint) return "";
  return `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`;
}

function getGmxsolImageUrl(
  marketName: string,
  indexTokenMint?: string,
): string {
  // Prefer mint-based token-list URL so we support more assets automatically.
  const mintUrl = getTokenImageFromMint(indexTokenMint);
  if (mintUrl) return mintUrl;

  // Try to extract the base token from market name (e.g., "SOL/USD", "BTC/USD")
  const base =
    marketName.split("/")[0]?.toUpperCase().trim() ||
    marketName.toUpperCase().trim();
  return TOKEN_IMAGES[base] || "";
}

function parseGmxsolSymbol(marketName: string): string {
  // Convert "SOL/USD" → "SOL-PERP", "BTC/USD" → "BTC-PERP"
  const base =
    marketName.split("/")[0]?.toUpperCase().trim() ||
    marketName.toUpperCase().trim();
  return `${base}-PERP`;
}

const EMPTY_PROJECTIONS: FundingProjections = {
  current: 0,
  h4: 0,
  h8: 0,
  h12: 0,
  d1: 0,
  d7: 0,
  d30: 0,
  apr: 0,
};

const EMPTY_METADATA: PerpFundingMetadata = {
  contractIndex: 0,
  baseCurrency: "",
  quoteCurrency: "",
  openInterest: "0",
  indexPrice: "0",
  nextFundingRate: "0",
  nextFundingRateTimestamp: "0",
  high24h: "0",
  low24h: "0",
  volume24h: "0",
};

async function fetchGmxsolMarkets(): Promise<PerpFundingRate[]> {
  const connection = new Connection(GMSOL_RPC_URL, "confirmed");

  const readOnlyProvider = new AnchorProvider(
    connection,
    {
      publicKey: PublicKey.default,
      signTransaction: async () => {
        throw new Error("Read-only");
      },
      signAllTransactions: async () => {
        throw new Error("Read-only");
      },
    } as any,
    { commitment: "confirmed", skipPreflight: true },
  );

  const program = new Program<GmsolStore>(IDL as any, readOnlyProvider);
  const markets = await listMarkets(program, connection);

  return markets
    .filter((m) => m.isEnabled && m.name.trim().length > 0)
    .map((m) => ({
      protocol: "gmxsol",
      symbol: parseGmxsolSymbol(m.name),
      price: 0,
      imageUrl: getGmxsolImageUrl(m.name, m.indexToken),
      fundingRate: 0,
      maxleverage: 50,
      projections: { ...EMPTY_PROJECTIONS },
      timestamp: Date.now(),
      metadata: { ...EMPTY_METADATA },
    }));
}

export function useGmxsolMarkets() {
  return useQuery({
    queryKey: ["gmxsol-markets"],
    queryFn: fetchGmxsolMarkets,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
