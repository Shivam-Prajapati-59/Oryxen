import { PythWebSocket } from "./providers/pythWs";

export class WebSocketManager {
  private pythWs: PythWebSocket;

  constructor() {
    // Initializing with 4 major assets
    const assets = ["BTC/USD", "SOL/USD", "ETH/USD", "JUP/USD"];

    this.pythWs = new PythWebSocket(assets, (data) => {
      console.log(`💰 [Pyth] ${data.symbol}: $${data.price.toFixed(4)}`);
    });
  }

  async start() {
    await this.pythWs.connect();
  }

  stop() {
    this.pythWs.disconnect();
  }

  isConnected(): boolean {
    return this.pythWs.isConnected();
  }
}
