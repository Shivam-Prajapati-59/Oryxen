"use client";

import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/config/env";
import { PerpFundingRate } from "@/hooks/useFundingRates";

type GmxsolMarketsResponse = {
  success: boolean;
  data: PerpFundingRate[];
};

async function fetchGmxsolMarkets(): Promise<PerpFundingRate[]> {
  const response = await fetch(`${API_BASE_URL}/api/gmxsol/markets`);

  if (!response.ok) {
    throw new Error(`Failed to fetch GMXSol markets: ${response.statusText}`);
  }

  const payload = (await response.json()) as GmxsolMarketsResponse;
  if (!payload.success) {
    throw new Error("GMXSol API returned unsuccessful response");
  }

  return payload.data;
}

export function useGmxsolMarkets() {
  return useQuery({
    queryKey: ["gmxsol-markets"],
    queryFn: fetchGmxsolMarkets,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
