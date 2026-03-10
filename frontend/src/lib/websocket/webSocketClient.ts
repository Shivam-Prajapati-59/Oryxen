interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

type ConnectionState = "disconnected" | "connecting" | "connected";

/**
 * Enterprise-grade WebSocket client for live price feeds.
 *
 * - Exponential backoff with jitter (capped at 30 s)
 * - Heartbeat ping every 30 s to detect dead connections
 * - Visibility-change aware: pauses in background, reconnects on focus
 * - Deduplicates subscription diffs (subscribe / unsubscribe deltas)
 * - Designed as a **singleton** — shared by all consumers via usePriceFeed
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onPriceUpdate: (data: PriceData) => void;
  private onStateChange: (state: ConnectionState) => void;

  private subscribedSymbols: string[] = [];
  private state: ConnectionState = "disconnected";

  // Reconnect
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private isManualDisconnect = false;
  private static readonly BASE_DELAY = 1_000;   // 1 s
  private static readonly MAX_DELAY = 30_000;    // 30 s

  // Heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongReceived = true;
  private static readonly HEARTBEAT_INTERVAL = 30_000; // 30 s

  // Visibility
  private boundVisibilityHandler: (() => void) | null = null;

  constructor(
    url: string,
    onPriceUpdate: (data: PriceData) => void,
    onStateChange: (state: ConnectionState) => void,
  ) {
    this.url = url;
    this.onPriceUpdate = onPriceUpdate;
    this.onStateChange = onStateChange;
    this.setupVisibilityHandler();
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /** Open (or re-use) the connection and subscribe to `symbols`. */
  connect(symbols: string[]) {
    this.subscribedSymbols = symbols;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(symbols);
      return;
    }
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    this.openSocket();
  }

  /** Update subscriptions on a live connection (diff-based). */
  updateSubscription(newSymbols: string[]) {
    const oldSet = new Set(this.subscribedSymbols);
    const newSet = new Set(newSymbols);

    const toUnsub = this.subscribedSymbols.filter((s) => !newSet.has(s));
    const toSub = newSymbols.filter((s) => !oldSet.has(s));

    this.subscribedSymbols = newSymbols;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (toUnsub.length > 0) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", symbols: toUnsub }));
    }
    if (toSub.length > 0) {
      this.ws.send(JSON.stringify({ type: "subscribe", symbols: toSub }));
    }
  }

  /** Gracefully close. No automatic reconnect. */
  disconnect() {
    this.isManualDisconnect = true;
    this.teardown();
  }

  getState(): ConnectionState {
    return this.state;
  }

  /* ------------------------------------------------------------------ */
  /*  Socket lifecycle                                                   */
  /* ------------------------------------------------------------------ */

  private openSocket() {
    this.teardown(false); // clean previous socket, keep reconnect intent
    this.isManualDisconnect = false;
    this.setState("connecting");

    const ws = new WebSocket(this.url);

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setState("connected");
      this.startHeartbeat();
      if (this.subscribedSymbols.length > 0) {
        this.sendSubscribe(this.subscribedSymbols);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "pong") {
          this.pongReceived = true;
          return;
        }
        if (msg.type === "price_update" && msg.data) {
          this.onPriceUpdate(msg.data);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose — handle reconnect there
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      this.setState("disconnected");
      if (!this.isManualDisconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws = ws;
  }

  private sendSubscribe(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", symbols }));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Heartbeat                                                          */
  /* ------------------------------------------------------------------ */

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pongReceived = true;
    this.heartbeatTimer = setInterval(() => {
      if (!this.pongReceived) {
        // Server didn't respond — force reconnect
        console.warn("[WS] Heartbeat timeout — reconnecting");
        this.ws?.close();
        return;
      }
      this.pongReceived = false;
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, WebSocketClient.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Reconnect with exponential backoff + jitter                        */
  /* ------------------------------------------------------------------ */

  private scheduleReconnect() {
    if (this.reconnectTimer || this.isManualDisconnect) return;

    const base = Math.min(
      WebSocketClient.BASE_DELAY * Math.pow(2, this.reconnectAttempt),
      WebSocketClient.MAX_DELAY,
    );
    // Add ±25 % jitter
    const jitter = base * (0.75 + Math.random() * 0.5);
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, jitter);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Visibility                                                         */
  /* ------------------------------------------------------------------ */

  private setupVisibilityHandler() {
    if (typeof document === "undefined") return;
    this.boundVisibilityHandler = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible — if disconnected, reconnect immediately
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.clearReconnectTimer();
          this.reconnectAttempt = 0;
          if (this.subscribedSymbols.length > 0 && !this.isManualDisconnect) {
            this.openSocket();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", this.boundVisibilityHandler);
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup                                                            */
  /* ------------------------------------------------------------------ */

  private setState(s: ConnectionState) {
    this.state = s;
    this.onStateChange(s);
  }

  /** Tear down socket + timers. If `full` (default), also marks manual disconnect. */
  private teardown(full = true) {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    if (this.ws) {
      // Prevent the onclose handler from triggering reconnect during teardown
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.onopen = null;
      try { ws.close(); } catch { /* already closed */ }
    }
    if (full) {
      this.setState("disconnected");
    }
  }

  /** Full cleanup including visibility listener. Call when truly done. */
  destroy() {
    this.isManualDisconnect = true;
    this.teardown();
    if (this.boundVisibilityHandler) {
      document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
  }
}
