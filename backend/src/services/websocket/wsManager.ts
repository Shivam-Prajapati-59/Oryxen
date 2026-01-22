import { PythWebSocket } from "./providers/pythWs";
import type { ServerWebSocket } from "bun";

interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

interface ClientData {
  subscribedSymbols: string[];
}

export class WebSocketManager {
  private pythWs: PythWebSocket;
  private clients: Set<ServerWebSocket<ClientData>> = new Set();
  private allRequestedSymbols: Set<string> = new Set();

  constructor() {
    this.pythWs = new PythWebSocket((data) => {
      this.broadcastPriceUpdate(data);
    });
  }

  handleWebSocket() {
    const manager = this; // Closure reference
    return {
      message: async (
        ws: ServerWebSocket<ClientData>,
        message: string | Buffer,
      ) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === "subscribe" && Array.isArray(data.symbols)) {
            const symbols = data.symbols.map((s: string) =>
              s.toUpperCase().replace("-PERP", "").replace("/USD", ""),
            );

            ws.data.subscribedSymbols = Array.from(
              new Set([...ws.data.subscribedSymbols, ...symbols]),
            );

            const newToPyth = symbols.filter(
              (s: string) => !this.allRequestedSymbols.has(s),
            );
            newToPyth.forEach((s: string) => this.allRequestedSymbols.add(s));

            if (newToPyth.length > 0) {
              await this.pythWs.subscribeToSymbols(
                newToPyth.map((s: string) => `${s}/USD`),
              );
            }

            ws.send(
              JSON.stringify({
                type: "subscription_confirmed",
                symbols: ws.data.subscribedSymbols,
              }),
            );
          }
        } catch (e) {
          console.error("WS Message Error", e);
        }
      },
      open: (ws: ServerWebSocket<ClientData>) => {
        ws.data = { subscribedSymbols: [] };
        this.clients.add(ws);
        ws.send(
          JSON.stringify({ type: "connected", message: "Ready for pricing" }),
        );
      },
      close: (ws: ServerWebSocket<ClientData>) => {
        this.clients.delete(ws);
        this.cleanupUnusedSymbols();
      },
    };
  }

  private cleanupUnusedSymbols() {
    const currentlyNeeded = new Set<string>();
    this.clients.forEach((c) =>
      c.data.subscribedSymbols.forEach((s) => currentlyNeeded.add(s)),
    );

    const toUnsubscribe: string[] = [];
    this.allRequestedSymbols.forEach((s) => {
      if (!currentlyNeeded.has(s)) {
        toUnsubscribe.push(`${s}/USD`);
        this.allRequestedSymbols.delete(s);
      }
    });

    if (toUnsubscribe.length > 0)
      this.pythWs.unsubscribeFromSymbols(toUnsubscribe);
  }

  private broadcastPriceUpdate(data: PriceData) {
    const symbol = data.symbol.replace("/USD", "");
    const message = JSON.stringify({
      type: "price_update",
      data: {
        symbol,
        price: data.price,
        timestamp: data.timestamp,
      },
    });

    this.clients.forEach((client) => {
      if (client.data.subscribedSymbols.includes(symbol)) {
        try {
          client.send(message);
        } catch (error) {
          console.error("❌ [WS Manager] Failed to send to client:", error);
          // Clean up broken client
          this.clients.delete(client);
          try {
            client.close();
          } catch (closeError) {
            // Ignore close errors for already-dead sockets
          }
        }
      }
    });
  }

  async start() {
    await this.pythWs.connect();
  }
  stop() {
    this.pythWs.disconnect();
    this.clients.forEach((c) => c.close());
    this.clients.clear();
  }
}
