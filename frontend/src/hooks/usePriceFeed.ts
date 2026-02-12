import { useEffect, useState, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { WebSocketClient } from "@/lib/websocket/webSocketClient";
import { WS_URL } from "@/config/env";

export const usePriceFeed = (symbols: string[] = []) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const wsClientRef = useRef<WebSocketClient | null>(null);

  const queryKey = ["price-feed", ...[...symbols].sort()];

  // Initialize the query state
  const query = useQuery({
    queryKey,
    queryFn: () => ({} as Record<string, number>),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    // Create WebSocket client if not exists
    if (!wsClientRef.current) {
      wsClientRef.current = new WebSocketClient(
        WS_URL,
        (data) => {
          // Update the TanStack cache
          queryClient.setQueryData(queryKey, (oldData: any) => ({
            ...oldData,
            [data.symbol]: data.price,
          }));
        },
        () => setIsConnected(true), // onOpen callback
        () => setIsConnected(false), // onClose callback
      );
    }

    // Connect or update subscription
    wsClientRef.current.connect(symbols);

    // Cleanup on unmount
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
      setIsConnected(false);
    };
  }, [symbols.join(","), queryClient]);

  return {
    prices: query.data ?? {},
    isLoading: query.isLoading,
    isConnected,
  };
};
