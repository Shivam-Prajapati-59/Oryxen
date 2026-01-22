import WebSocket from "ws";

interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

export class PythWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;

  private idToSymbolMap: Map<string, string> = new Map();
  private symbolToIdMap: Map<string, string> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private onPriceUpdate?: (data: PriceData) => void;

  constructor(onPriceUpdate?: (data: PriceData) => void) {
    this.onPriceUpdate = onPriceUpdate;
  }

  private async resolveSymbolsToIds(
    symbols: string[],
  ): Promise<{ ids: string[]; resolvedSymbols: string[] }> {
    const ids: string[] = [];
    const resolvedSymbols: string[] = [];

    for (const symbol of symbols) {
      if (this.symbolToIdMap.has(symbol)) {
        ids.push(this.symbolToIdMap.get(symbol)!);
        resolvedSymbols.push(symbol);
        continue;
      }

      try {
        const url = `https://hermes.pyth.network/v2/price_feeds?query=${symbol}&asset_type=crypto`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `❌ [Pyth WS] Failed to fetch price feeds for ${symbol}: HTTP ${response.status} ${response.statusText}`,
            errorText,
          );
          continue;
        }

        const data = (await response.json()) as any[];

        // Exact matching logic to avoid matching "WBTC" when searching for "BTC"
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
          const normalizedId = asset.id.replace("0x", "").toLowerCase();
          this.idToSymbolMap.set(normalizedId, symbol);
          this.symbolToIdMap.set(symbol, asset.id);
          ids.push(asset.id);
          resolvedSymbols.push(symbol);
          // console.log(`✓ [Pyth WS] Resolved ${symbol} to feed ID`);
        } else {
          console.warn(
            `⚠️ [Pyth WS] No matching asset found for ${symbol} in Pyth feed data`,
          );
        }
      } catch (error) {
        console.error(`❌ [Pyth WS] Resolution error for ${symbol}:`, error);
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
      console.error("❌ [Pyth WS] WebSocket error:", error);
    });

    this.ws.on("close", () => {
      console.log("❌ [Pyth WS] Disconnected from Pyth Network");
      this.cleanup();
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
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws = null;
  }

  private scheduleReconnect() {
    this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
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
