"use client";

import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/config/env";

export interface PerpFundingMetadata {
  contractIndex: number;
  baseCurrency: string;
  quoteCurrency: string;
  openInterest: string; // JSON returns this as a string
  indexPrice: string;
  nextFundingRate: string;
  nextFundingRateTimestamp: string;
  high24h: string;
  low24h: string;
  volume24h: string;
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

// Updated to match the main object in your JSON
export interface PerpFundingRate {
  protocol: string;
  symbol: string;
  price: number;
  imageUrl: string; // New field
  fundingRate: number; // Replaces 'hourlyRate'
  maxleverage: number; // New field
  projections: FundingProjections;
  timestamp: number;
  metadata: PerpFundingMetadata;
}

// Updated to match the root response structure
export interface FundingRateResponse {
  success: boolean;
  data: PerpFundingRate[];
}

async function fetchFundingRates(
  protocol: string,
): Promise<FundingRateResponse> {
  // Ensure we are hitting the correct endpoint for the new data structure
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
    refetchInterval: 1 * 60 * 1000, // Auto-refetch every minute
    refetchOnWindowFocus: false,
    enabled: !!protocol,
  });
}

// Hook to fetch all protocols and aggregate them
export function useAllFundingRates() {
  const drift = useFundingRates("drift");
  const hyperliquid = useFundingRates("hyperliquid");

  return {
    drift,
    hyperliquid,
    isLoading: drift.isLoading || hyperliquid.isLoading,
    isError: drift.isError || hyperliquid.isError,
    // Safely aggregate the data arrays
    allData: [...(drift.data?.data || []), ...(hyperliquid.data?.data || [])],
  };
}
