import WebSocket from "ws";

interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

export class PythWebSocket {
  private ws: WebSocket | null = null;
  private isManualDisconnect: boolean = false;

  private idToSymbolMap: Map<string, string> = new Map();
  private symbolToIdMap: Map<string, string> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private onPriceUpdate?: (data: PriceData) => void;

  // Reconnect with exponential backoff
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private static readonly BASE_DELAY = 1_000; // 1 s
  private static readonly MAX_DELAY = 30_000; // 30 s

  // Heartbeat to keep Hermes WS alive
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly HEARTBEAT_INTERVAL = 20_000; // 20 s

  constructor(onPriceUpdate?: (data: PriceData) => void) {
    this.onPriceUpdate = onPriceUpdate;
  }

  private async resolveSymbolsToIds(
    symbols: string[],
  ): Promise<{ ids: string[]; resolvedSymbols: string[] }> {
    const ids: string[] = [];
    const resolvedSymbols: string[] = [];

    // Separate already-cached symbols from new ones
    const toResolve: string[] = [];
    for (const symbol of symbols) {
      if (this.symbolToIdMap.has(symbol)) {
        ids.push(this.symbolToIdMap.get(symbol)!);
        resolvedSymbols.push(symbol);
      } else {
        toResolve.push(symbol);
      }
    }

    if (toResolve.length === 0) return { ids, resolvedSymbols };

    // Resolve all new symbols in parallel
    const results = await Promise.all(
      toResolve.map(async (symbol) => {
        try {
          const url = `https://hermes.pyth.network/v2/price_feeds?query=${symbol}&asset_type=crypto`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `❌ [Pyth WS] Failed to fetch price feeds for ${symbol}: HTTP ${response.status} ${response.statusText}`,
              errorText,
            );
            return null;
          }

          const data = (await response.json()) as any[];

          const asset = data.find((item: any) => {
            const displaySymbol = item.attributes.display_symbol;
            const fullSymbol = item.attributes.symbol;
            return (
              displaySymbol === symbol ||
              displaySymbol === `${symbol}/USD` ||
              fullSymbol === `Crypto.${symbol}/USD`
            );
          });

          if (asset) {
            return { symbol, id: asset.id };
          } else {
            console.warn(
              `⚠️ [Pyth WS] No matching asset found for ${symbol} in Pyth feed data`,
            );
            return null;
          }
        } catch (error) {
          console.error(`❌ [Pyth WS] Resolution error for ${symbol}:`, error);
          return null;
        }
      }),
    );

    // Collect results
    for (const result of results) {
      if (result) {
        const normalizedId = result.id.replace("0x", "").toLowerCase();
        this.idToSymbolMap.set(normalizedId, result.symbol);
        this.symbolToIdMap.set(result.symbol, result.id);
        ids.push(result.id);
        resolvedSymbols.push(result.symbol);
      }
    }

    return { ids, resolvedSymbols };
  }

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.cleanup();
    this.isManualDisconnect = false;

    this.ws = new WebSocket("wss://hermes.pyth.network/ws");

    this.ws.on("open", () => {
      console.log("✅ [Pyth WS] Connected to Pyth Network");
      this.reconnectAttempt = 0;
      this.startHeartbeat();
      if (this.subscribedSymbols.size > 0) {
        const symbolsToResubscribe = Array.from(this.subscribedSymbols);
        // Clear subscribed symbols so subscribeToSymbols will process them
        this.subscribedSymbols.clear();
        this.subscribeToSymbols(symbolsToResubscribe);
      }
    });

    this.ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === "price_update") this.handlePriceUpdate(message);
      } catch (e) {
        console.error("Parse error", e);
      }
    });

    this.ws.on("error", (error) => {
      console.error("❌ [Pyth WS] WebSocket error:", error.message);
    });

    this.ws.on("close", () => {
      console.log("❌ [Pyth WS] Disconnected from Pyth Network");
      this.stopHeartbeat();
      this.ws = null;
      if (!this.isManualDisconnect) this.scheduleReconnect();
    });
  }

  private handlePriceUpdate(message: any) {
    if (!this.onPriceUpdate || !message.price_feed) return;

    const priceFeed = message.price_feed;
    const receivedId = priceFeed.id.replace("0x", "").toLowerCase();
    const symbol = this.idToSymbolMap.get(receivedId);

    if (!symbol) return;

    const { price, expo, publish_time } = priceFeed.price;

    // Lock precision to 4 decimals to prevent floating point noise
    const humanPrice = parseFloat(
      (Number(price) * Math.pow(10, expo)).toFixed(4),
    );

    this.onPriceUpdate({
      symbol,
      price: humanPrice,
      timestamp: publish_time * 1000,
    });
  }

  async subscribeToSymbols(symbols: string[]) {
    const newSymbols = symbols.filter((s) => !this.subscribedSymbols.has(s));
    if (newSymbols.length === 0) return;

    try {
      // First resolve symbols to IDs
      const { ids, resolvedSymbols } =
        await this.resolveSymbolsToIds(newSymbols);

      // Only add successfully resolved symbols to the subscription set
      resolvedSymbols.forEach((s) => this.subscribedSymbols.add(s));

      // Log any failed resolutions
      const failedSymbols = newSymbols.filter(
        (s) => !resolvedSymbols.includes(s),
      );
      if (failedSymbols.length > 0) {
        console.warn(
          `⚠️ [Pyth WS] Failed to resolve symbols: ${failedSymbols.join(", ")}`,
        );
      }

      // Only send subscription if we have valid IDs and connection is open
      if (ids.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "subscribe", ids }));
        // console.log(
        //   `✅ [Pyth WS] Subscribed to ${resolvedSymbols.length} symbol(s): ${resolvedSymbols.join(", ")}`,
        // );
      } else if (ids.length === 0) {
        console.warn(`⚠️ [Pyth WS] No valid IDs to subscribe to`);
      } else {
        console
          .warn
          // `⚠️ [Pyth WS] WebSocket not ready, cannot subscribe to ${resolvedSymbols.length} symbol(s)`,
          ();
      }
    } catch (error) {
      console.error(`❌ [Pyth WS] Error in subscribeToSymbols:`, error);
      // Do not mutate subscribedSymbols on error
    }
  }

  async unsubscribeFromSymbols(symbols: string[]) {
    const feedIds: string[] = [];
    symbols.forEach((s) => {
      const id = this.symbolToIdMap.get(s);
      if (id) {
        feedIds.push(id);
        this.subscribedSymbols.delete(s);
      }
    });

    if (feedIds.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", ids: feedIds }));
    }
  }

  private cleanup() {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
    }
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isManualDisconnect) return;
    const base = Math.min(
      PythWebSocket.BASE_DELAY * Math.pow(2, this.reconnectAttempt),
      PythWebSocket.MAX_DELAY,
    );
    const jitter = base * (0.75 + Math.random() * 0.5);
    this.reconnectAttempt++;
    console.log(
      `[Pyth WS] Reconnecting in ${Math.round(jitter)}ms (attempt ${this.reconnectAttempt})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jitter);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, PythWebSocket.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.ws?.close();
    this.cleanup();
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
