"use client";

import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/config/env";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Types                                    */
/* -------------------------------------------------------------------------- */

// This matches what you want to use in your UI (remains the same)
export interface PerpBasicInfo {
  protocol: string;
  symbol: string;
  imageUrl: string;
  maxleverage: number;
  marketIndex: number; // This will hold the contractIndex
}

// This matches the actual JSON coming from the API
interface PerpRawData {
  protocol: string;
  symbol: string;
  imageUrl: string;
  maxleverage: number;
  // Define the metadata object
  metadata: {
    contractIndex: number;
    [key: string]: any; // Allow other metadata fields
  };
  [key: string]: any;
}

// Update the response to use the Raw Data type
export interface PerpDataResponse {
  success: boolean;
  data: PerpRawData[];
  timestamp: number;
  count: number;
}

/* -------------------------------------------------------------------------- */
/*                                  Fetcher                                   */
/* -------------------------------------------------------------------------- */

async function fetchAllPerps(): Promise<PerpBasicInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/funding-rates/unique`);

  if (!response.ok) {
    throw new Error("Failed to fetch funding rates from DB");
  }

  // The result is typed with the Raw structure containing metadata
  const result: PerpDataResponse = await response.json();

  if (!result.success) {
    throw new Error("API returned unsuccessful response");
  }

  // Map the raw API data to your UI structure
  return result.data.map((perp) => ({
    protocol: perp.protocol,
    symbol: perp.symbol,
    imageUrl: perp.imageUrl,
    maxleverage: perp.maxleverage,
    marketIndex: perp.metadata?.contractIndex ?? 0,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                    Hook                                    */
/* -------------------------------------------------------------------------- */

export function useAllPerps() {
  return useQuery({
    queryKey: ["allPerps"],
    queryFn: fetchAllPerps,
    staleTime: 10 * 60 * 1000, // 10 minutes (since data doesn't change often)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 3,
  });
}

/* -------------------------------------------------------------------------- */
/*                          Protocol-Specific Hooks                           */
/* -------------------------------------------------------------------------- */

async function fetchPerpsByProtocol(
  protocol: string,
): Promise<PerpBasicInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/${protocol}/funding-rates`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${protocol} funding rates`);
  }

  const result: PerpDataResponse = await response.json();

  if (!result.success) {
    throw new Error("API returned unsuccessful response");
  }

  return result.data.map((perp) => ({
    protocol: perp.protocol,
    symbol: perp.symbol,
    imageUrl: perp.imageUrl,
    maxleverage: perp.maxleverage,
    marketIndex: perp.metadata?.contractIndex ?? 0,
  }));
}

export function useDriftPerps() {
  return useQuery({
    queryKey: ["driftPerps"],
    queryFn: () => fetchPerpsByProtocol("drift"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
}

export function useHyperliquidPerps() {
  return useQuery({
    queryKey: ["hyperliquidPerps"],
    queryFn: () => fetchPerpsByProtocol("hyperliquid"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });
}

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

// Filter perps by protocol
export function useFilteredPerps(protocol?: string) {
  const { data, ...rest } = useAllPerps();

  const filteredData = protocol
    ? data?.filter((perp) => perp.protocol === protocol)
    : data;

  return {
    data: filteredData,
    ...rest,
  };
}

// Search perps by symbol
export function useSearchPerps(searchQuery: string) {
  const { data, ...rest } = useAllPerps();

  const searchResults = data
    ? data.filter((perp) =>
        perp.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : undefined;

  return {
    data: searchResults,
    ...rest,
  };
}

// Get unique symbols across all protocols
export function useUniqueSymbols() {
  const { data, ...rest } = useAllPerps();

  const uniqueSymbols = data
    ? Array.from(new Set(data.map((perp) => perp.symbol)))
    : undefined;

  return {
    data: uniqueSymbols,
    ...rest,
  };
}

// Group by protocol
export function useGroupedByProtocol() {
  const { data, ...rest } = useAllPerps();

  const grouped = data?.reduce((acc, perp) => {
    if (!acc[perp.protocol]) {
      acc[perp.protocol] = [];
    }
    acc[perp.protocol].push(perp);
    return acc;
  }, {} as Record<string, PerpBasicInfo[]>);

  return {
    data: grouped,
    ...rest,
  };
}
