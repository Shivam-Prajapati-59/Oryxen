"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface PerpBasicInfo {
  protocol: string;
  symbol: string;
  imageUrl: string;
}

export interface PerpDataResponse {
  success: boolean;
  data: PerpBasicInfo[];
  timestamp: number;
  count: number;
}

/* -------------------------------------------------------------------------- */
/*                                  Fetcher                                   */
/* -------------------------------------------------------------------------- */

async function fetchAllPerps(): Promise<PerpBasicInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/funding-rates`);

  if (!response.ok) {
    throw new Error("Failed to fetch funding rates from DB");
  }

  const result: PerpDataResponse = await response.json();

  if (!result.success) {
    throw new Error("API returned unsuccessful response");
  }

  // Extract only protocol, symbol, and imageUrl
  return result.data.map((perp) => ({
    protocol: perp.protocol,
    symbol: perp.symbol,
    imageUrl: perp.imageUrl,
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

  const grouped = data?.reduce(
    (acc, perp) => {
      if (!acc[perp.protocol]) {
        acc[perp.protocol] = [];
      }
      acc[perp.protocol].push(perp);
      return acc;
    },
    {} as Record<string, PerpBasicInfo[]>,
  );

  return {
    data: grouped,
    ...rest,
  };
}
