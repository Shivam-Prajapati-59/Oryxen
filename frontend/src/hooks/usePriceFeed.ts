import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { WebSocketClient } from "@/lib/websocket/webSocketClient";
import { WS_URL } from "@/config/env";

/**
 * Singleton price-feed manager.
 *
 * All components share ONE WebSocket connection.  Each consumer registers the
 * symbols it needs; the manager unions them and handles subscribe/unsubscribe
 * diffs on the shared socket.
 */
class PriceFeedManager {
  private client: WebSocketClient | null = null;
  /** symbol → latest price */
  private prices: Record<string, number> = {};
  /** subscriber-id → Set<symbol> */
  private subscribers = new Map<string, Set<string>>();
  /** subscriber-id → callback */
  private listeners = new Map<
    string,
    (prices: Record<string, number>) => void
  >();
  private stateListeners = new Map<string, (connected: boolean) => void>();
  private connected = false;
  private nextId = 0;

  /** Register a consumer. Returns an unsubscribe function. */
  subscribe(
    symbols: string[],
    onPrices: (prices: Record<string, number>) => void,
    onState: (connected: boolean) => void,
  ): { id: string; unsubscribe: () => void } {
    const id = String(++this.nextId);
    this.subscribers.set(id, new Set(symbols));
    this.listeners.set(id, onPrices);
    this.stateListeners.set(id, onState);

    // Send current state immediately
    onState(this.connected);
    if (Object.keys(this.prices).length > 0) onPrices({ ...this.prices });

    this.reconcile();

    return {
      id,
      unsubscribe: () => {
        this.subscribers.delete(id);
        this.listeners.delete(id);
        this.stateListeners.delete(id);
        this.reconcile();
      },
    };
  }

  /** Update the symbol set for an existing subscriber. */
  updateSymbols(id: string, symbols: string[]) {
    if (!this.subscribers.has(id)) return;
    this.subscribers.set(id, new Set(symbols));
    this.reconcile();
  }

  /** Merge all subscriber symbol sets and sync the WS connection. */
  private reconcile() {
    const allSymbols = new Set<string>();
    this.subscribers.forEach((syms) => syms.forEach((s) => allSymbols.add(s)));
    const sorted = Array.from(allSymbols).sort();

    if (sorted.length === 0) {
      // No subscribers — disconnect
      if (this.client) {
        this.client.destroy();
        this.client = null;
      }
      return;
    }

    if (!this.client) {
      this.client = new WebSocketClient(
        WS_URL,
        (data) => {
          this.prices[data.symbol] = data.price;
          // Notify only subscribers interested in this symbol
          this.listeners.forEach((cb, subId) => {
            if (this.subscribers.get(subId)?.has(data.symbol)) {
              cb({ ...this.prices });
            }
          });
        },
        (state) => {
          this.connected = state === "connected";
          this.stateListeners.forEach((cb) => cb(this.connected));
        },
      );
      this.client.connect(sorted);
    } else {
      this.client.updateSubscription(sorted);
    }
  }
}

/** Module-level singleton — survives component mounts/unmounts. */
let manager: PriceFeedManager | null = null;
function getManager(): PriceFeedManager {
  if (!manager) manager = new PriceFeedManager();
  return manager;
}

/**
 * Hook to subscribe to live Pyth prices via the shared WebSocket.
 *
 * Multiple components can call `usePriceFeed(["SOL"])`, `usePriceFeed(["BTC"])`
 * etc. and they all share one socket.  Subscriptions are ref-counted; the
 * socket is torn down only when the last consumer unmounts.
 */
export const usePriceFeed = (symbols: string[] = []) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);

  // Stabilise the symbols array so the effect doesn't re-fire on every render
  const symbolsKey = useMemo(() => [...symbols].sort().join(","), [symbols]);

  const subRef = useRef<{ id: string; unsubscribe: () => void } | null>(null);

  const handlePrices = useCallback(
    (p: Record<string, number>) => setPrices(p),
    [],
  );
  const handleState = useCallback((c: boolean) => setIsConnected(c), []);

  // Handle subscription lifecycle (mount/unmount only)
  useEffect(() => {
    const syms = symbolsKey ? symbolsKey.split(",") : [];
    if (syms.length === 0 || (syms.length === 1 && syms[0] === "")) return;

    const mgr = getManager();
    subRef.current = mgr.subscribe(syms, handlePrices, handleState);

    return () => {
      subRef.current?.unsubscribe();
      subRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePrices, handleState]);

  // Handle symbol updates without re-subscribing
  useEffect(() => {
    if (!subRef.current) return;
    const syms = symbolsKey ? symbolsKey.split(",") : [];
    if (syms.length === 0 || (syms.length === 1 && syms[0] === "")) return;
    getManager().updateSymbols(subRef.current.id, syms);
  }, [symbolsKey]);

  return { prices, isLoading: false, isConnected };
};
