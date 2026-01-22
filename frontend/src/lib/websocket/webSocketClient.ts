interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;
  private url: string;
  private onPriceUpdate?: (data: PriceData) => void;
  private onOpen?: () => void;
  private onClose?: () => void;
  private subscribedSymbols: string[] = [];

  constructor(
    url: string,
    onPriceUpdate?: (data: PriceData) => void,
    onOpen?: () => void,
    onClose?: () => void,
  ) {
    this.url = url;
    this.onPriceUpdate = onPriceUpdate;
    this.onOpen = onOpen;
    this.onClose = onClose;
  }

  connect(symbols: string[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // If already connected, just update subscription
      this.updateSubscription(symbols);
      return;
    }

    // Don't create a new socket if one is already connecting
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      // Queue subscription for when connection completes
      this.subscribedSymbols = symbols;
      return;
    }

    this.cleanup();
    this.isManualDisconnect = false;
    this.subscribedSymbols = symbols;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("✅ Connected to WebSocket server");
      // Call onOpen callback
      if (this.onOpen) this.onOpen();
      // Subscribe to symbols
      this.subscribe(symbols);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "price_update" && this.onPriceUpdate) {
          this.onPriceUpdate(message.data);
        } else if (message.type === "connected") {
          console.log("📡", message.message);
        } else if (message.type === "subscription_confirmed") {
          console.log("✅ Subscription confirmed:", message.symbols);
        }
      } catch (error) {
        console.error("Parse error:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("❌ Disconnected from WebSocket server");
      // Call onClose callback
      if (this.onClose) this.onClose();
      this.cleanup();
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private subscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols,
      }),
    );
    console.log("📡 Subscribing to:", symbols);
  }

  updateSubscription(newSymbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.subscribedSymbols = newSymbols;
      return;
    }

    const oldSymbols = new Set(this.subscribedSymbols);
    const newSymbolsSet = new Set(newSymbols);

    // Find symbols to unsubscribe
    const toUnsubscribe = this.subscribedSymbols.filter(
      (s) => !newSymbolsSet.has(s),
    );

    // Find symbols to subscribe
    const toSubscribe = newSymbols.filter((s) => !oldSymbols.has(s));

    if (toUnsubscribe.length > 0) {
      this.ws.send(
        JSON.stringify({
          type: "unsubscribe",
          symbols: toUnsubscribe,
        }),
      );
      console.log("🔕 Unsubscribing from:", toUnsubscribe);
    }

    if (toSubscribe.length > 0) {
      this.ws.send(
        JSON.stringify({
          type: "subscribe",
          symbols: toSubscribe,
        }),
      );
      console.log("📡 Subscribing to:", toSubscribe);
    }

    this.subscribedSymbols = newSymbols;
  }

  disconnect() {
    this.isManualDisconnect = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.isManualDisconnect) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(this.subscribedSymbols);
    }, 5000);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
