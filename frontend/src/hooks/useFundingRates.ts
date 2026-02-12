"use client";

import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/config/env";

export interface PerpFundingMetadata {
  slot?: number;
  rawFundingRate?: string;
  oraclePriceTwap?: number;
  premium?: string;
  coin?: string;
}

export interface FundingProjections {
  current: number;
  h4: number;
  h8: number;
  h12: number;
  d1: number;
  d7: number;
  d30: number;
  apr: number;
}

export interface PerpFundingRate {
  protocol: string;
  symbol: string;
  price: number | null;
  hourlyRate: number;
  projections: FundingProjections;
  timestamp: number;
  metadata?: PerpFundingMetadata;
}

export interface FundingRateResponse {
  success: boolean;
  data: PerpFundingRate[];
  timestamp: number;
  count: number;
}

async function fetchFundingRates(
  protocol: string,
): Promise<FundingRateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/${protocol}/funding-rates/`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch funding rates for ${protocol}: ${response.statusText}`,
    );
  }

  const data: FundingRateResponse = await response.json();

  if (!data.success) {
    throw new Error("API returned unsuccessful response");
  }

  return data;
}

export function useFundingRates(protocol: "drift" | "hyperliquid") {
  return useQuery({
    queryKey: ["funding-rates", protocol],
    queryFn: () => fetchFundingRates(protocol),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    refetchOnWindowFocus: false,
    enabled: !!protocol, // Only fetch if protocol is provided
  });
}

// Optional: Hook to fetch all protocols
export function useAllFundingRates() {
  const drift = useFundingRates("drift");
  const hyperliquid = useFundingRates("hyperliquid");

  return {
    drift,
    hyperliquid,
    isLoading: drift.isLoading || hyperliquid.isLoading,
    isError: drift.isError || hyperliquid.isError,
    allData: [...(drift.data?.data || []), ...(hyperliquid.data?.data || [])],
  };
}
