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

  // Map of Hex IDs to human symbols (e.g., "BTC/USD")
  private idToSymbolMap: Map<string, string> = new Map();
  private symbols: string[];
  private onPriceUpdate?: (data: PriceData) => void;

  constructor(symbols: string[], onPriceUpdate?: (data: PriceData) => void) {
    this.symbols = symbols; // Pass up to 4 symbols here
    this.onPriceUpdate = onPriceUpdate;
  }

  private async resolveSymbolsToIds(): Promise<string[]> {
    console.log(`🔍 [Pyth WS] Resolving IDs for: ${this.symbols.join(", ")}`);
    const ids: string[] = [];

    for (const symbol of this.symbols) {
      try {
        const url = `https://hermes.pyth.network/v2/price_feeds?query=${symbol}&asset_type=crypto`;
        const response = await fetch(url);
        const data = (await response.json()) as any[];

        const asset = data.find((item: any) =>
          item.attributes.symbol.toLowerCase().includes(symbol.toLowerCase()),
        );

        if (asset) {
          const normalizedId = asset.id.replace("0x", "").toLowerCase();
          this.idToSymbolMap.set(normalizedId, symbol);
          ids.push(asset.id);
        }
      } catch (error) {
        console.error(`❌ [Pyth WS] Failed to resolve ${symbol}:`, error);
      }
    }
    return ids;
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.cleanup();
    this.isManualDisconnect = false;

    const feedIds = await this.resolveSymbolsToIds();
    if (feedIds.length === 0) return;

    this.ws = new WebSocket("wss://hermes.pyth.network/ws");

    this.ws.on("open", () => {
      console.log("✅ [Pyth WS] Connected");
      this.subscribeToPriceFeeds(feedIds);
    });

    this.ws.on("message", (raw) => this.handleMessage(raw));
    this.ws.on("close", () => {
      this.cleanup();
      if (!this.isManualDisconnect) this.scheduleReconnect();
    });
  }

  private handleMessage(raw: WebSocket.Data) {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === "price_update") {
        this.handlePriceUpdate(message);
      }
    } catch (error) {
      console.error("[Pyth WS] Parse error:", error);
    }
  }

  private handlePriceUpdate(message: any) {
    if (!this.onPriceUpdate || !message.price_feed) return;

    const priceFeed = message.price_feed;
    const receivedId = priceFeed.id.replace("0x", "").toLowerCase();
    const symbol = this.idToSymbolMap.get(receivedId);

    if (!symbol) return;

    const { price, expo, publish_time } = priceFeed.price;
    const humanPrice = Number(price) * 10 ** expo;

    this.onPriceUpdate({
      symbol,
      price: humanPrice,
      timestamp: publish_time * 1000,
    });
  }

  private subscribeToPriceFeeds(ids: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "subscribe", ids }));
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.cleanup();
    this.ws?.close();
  }

  private cleanup() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.isManualDisconnect) return;
    this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
