// frontend/src/hooks/usePerps.ts
"use client";

import { useQuery } from "@tanstack/react-query";

export interface PerpData {
  name: string;
  protocol: string;
  imageUrl: string | null;
  baseAsset: string;
}

interface PerpsResponse {
  success: boolean;
  data: PerpData[];
  timestamp: number;
  count: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchPerps(): Promise<PerpData[]> {
  const response = await fetch(`${API_BASE_URL}/api/perps/list`);

  if (!response.ok) {
    throw new Error(`Failed to fetch perps: ${response.statusText}`);
  }

  const data: PerpsResponse = await response.json();

  if (!data.success) {
    throw new Error("API returned unsuccessful response");
  }

  return data.data;
}

export function usePerps() {
  return useQuery({
    queryKey: ["perps"],
    queryFn: fetchPerps,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// Optional: Hook with protocol filter
export function usePerpsByProtocol(protocol?: string) {
  return useQuery({
    queryKey: ["perps", protocol],
    queryFn: async () => {
      const perps = await fetchPerps();
      if (!protocol) return perps;
      return perps.filter((perp) => perp.protocol.toLowerCase().includes(protocol.toLowerCase()));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: true,
  });
}