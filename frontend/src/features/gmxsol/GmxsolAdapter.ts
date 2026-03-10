import type {
  IProtocolAdapter,
  ProtocolName,
  OrderParams,
  TradeResult,
  CollateralInfo,
  MarketInfo,
  OrderEstimate,
  Position,
} from "../protocol-adapter/types";
import type { useGmsol } from "./hooks/useGmsol";
import { GMSOL_NETWORK } from "./constants";

/** Token decimals registry keyed by normalized symbol. */
const TOKEN_DECIMALS: Record<string, number> = {
  sol: 9,
  wsol: 9,
  usdc: 6,
  usdt: 6,
  btc: 8,
  wbtc: 8,
  eth: 18,
  weth: 18,
};

/** Resolve decimals for a token by symbol (falls back to 9 for SOL-like tokens). */
function resolveTokenDecimals(token: string): number {
  return TOKEN_DECIMALS[token.toLowerCase()] ?? 9;
}

/**
 * Scale a decimal number/string to a BigInt integer string with the given precision.
 * Handles fractional values without floating-point loss.
 */
function scaleDecimalToBigInt(value: number | string, decimals: number): string {
  const str = String(value);
  const [intPart, fracPart = ""] = str.split(".");
  const paddedFrac = fracPart.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(intPart + paddedFrac).toString();
}

/**
 * GMXSol Protocol Adapter
 * Wraps the useGmsol hook to conform to IProtocolAdapter interface
 */
export class GmxsolAdapter implements IProtocolAdapter {
  readonly name: ProtocolName = "GMXSol";
  readonly displayName = "GMX Sol";

  private hook: ReturnType<typeof useGmsol>;

  constructor(hook: ReturnType<typeof useGmsol>) {
    this.hook = hook;
  }

  updateHook(hook: ReturnType<typeof useGmsol>): void {
    this.hook = hook;
  }

  get isInitialized(): boolean {
    return !!this.hook.privyWallet && !!this.hook.program;
  }

  get isLoading(): boolean {
    return this.hook.isLoading;
  }

  get error(): string | null {
    return this.hook.error;
  }

  get userAccountExists(): boolean | null {
    // GMSOL doesn't require a separate user account creation (unlike Drift)
    // If wallet is connected, user "exists"
    return this.hook.privyWallet ? true : null;
  }

  async initialize(): Promise<void> {
    // GMSOL initializes automatically when wallet is available
    // Fetch markets to ensure data is ready
    await this.hook.fetchMarkets();
    await this.hook.fetchPositionsAndOrders();
  }

  async initializeUserAccount(): Promise<void> {
    // No separate user account needed for GMSOL
  }

  async deposit(amount: number, token: string): Promise<TradeResult> {
    // Find a market that uses this token
    const market = this.findMarketByToken(token);
    if (!market) throw new Error(`No GMSOL market found for token ${token}`);

    // Convert human amount to raw using token decimals registry
    const decimals = resolveTokenDecimals(token);
    const rawAmount = Math.floor(amount * Math.pow(10, decimals)).toString();

    const sigs = await this.hook.submitDeposit({
      marketToken: market.marketTokenMint,
      longToken: market.longToken,
      shortToken: market.shortToken,
      longPayToken: market.longToken,
      shortPayToken: market.shortToken,
      longPayAmount: rawAmount,
      shortPayAmount: "0",
      minReceiveAmount: "0",
    });

    const sig = sigs?.[0];
    if (!sig) {
      throw new Error("Deposit transaction failed: no signature returned");
    }
    return {
      signature: sig,
      explorerUrl: `https://solscan.io/tx/${sig}?cluster=${GMSOL_NETWORK}`,
    };
  }

  async withdraw(amount: number, token: string): Promise<TradeResult> {
    const market = this.findMarketByToken(token);
    if (!market) throw new Error(`No GMSOL market found for token ${token}`);

    const decimals = resolveTokenDecimals(token);
    const rawAmount = Math.floor(amount * Math.pow(10, decimals)).toString();

    const sigs = await this.hook.submitWithdrawal({
      marketToken: market.marketTokenMint,
      longToken: market.longToken,
      shortToken: market.shortToken,
      marketTokenAmount: rawAmount,
    });

    const sig = sigs?.[0] || "";
    return {
      signature: sig,
      explorerUrl: `https://solscan.io/tx/${sig}?cluster=${GMSOL_NETWORK}`,
    };
  }

  getCollateralInfo(): CollateralInfo {
    // GMSOL doesn't have a central collateral account like Drift
    // Instead, collateral is per-position; we sum across positions
    let totalCollateral = 0;
    const PRECISION = BigInt(10) ** BigInt(30);
    for (const pos of this.hook.positions) {
      const raw = BigInt(pos.collateralAmount || "0");
      // Scale to 4 decimal places in BigInt domain, then convert to Number
      const scaled = (raw * BigInt(10000)) / PRECISION;
      totalCollateral += Number(scaled) / 10000;
    }

    return {
      totalCollateral,
      freeCollateral: 0, // GMSOL sends collateral per-order, not from a pool
      marginUsed: totalCollateral,
    };
  }

  getMarketInfo(marketIndex: number): MarketInfo {
    const market = this.hook.markets[marketIndex];
    if (!market) {
      return { price: 0 };
    }

    return {
      price: 0, // Would need oracle price feed integration
      maxLeverage: 50, // GMSOL max leverage
    };
  }

  getMarketPrice(_marketIndex: number): number {
    // Would require Pyth oracle integration for real-time price
    return 0;
  }

  async placeOrder(params: OrderParams): Promise<TradeResult> {
    const market = this.hook.markets[params.marketIndex];
    if (!market)
      throw new Error(`Market at index ${params.marketIndex} not found`);

    // Map the generic OrderType to GMSOL's CreateOrderKind
    let orderKind: string;
    switch (params.orderType) {
      case "market":
        orderKind = "MarketIncrease";
        break;
      case "limit":
        orderKind = "LimitIncrease";
        break;
      case "takeProfit":
        orderKind = "LimitDecrease";
        break;
      case "stopLimit":
        orderKind = "StopLossDecrease";
        break;
      default:
        orderKind = "MarketIncrease";
    }

    // Convert human-readable values to GMSOL raw format using BigInt arithmetic
    const leverageVal = params.leverage || 1;
    // Scale baseAssetAmount to 9-decimal integer, then compute in BigInt to avoid overflow
    const amountBig = BigInt(Math.round(params.baseAssetAmount * 1e9));
    const leverageBig = BigInt(Math.round(leverageVal));
    // sizeUsd = leveragedAmount * 1e30 = (amount * leverage) * 1e30 / 1e9
    const sizeUsd = (amountBig * leverageBig * BigInt(10) ** BigInt(21)).toString();
    const amount = amountBig.toString(); // SOL decimals (9)

    const collateralToken =
      params.direction === "long" ? market.longToken : market.shortToken;

    const triggerPrice = params.price
      ? scaleDecimalToBigInt(params.price, 30)
      : "";

    const tpPrice = params.takeProfit
      ? scaleDecimalToBigInt(params.takeProfit, 30)
      : "";

    const slPrice = params.stopLoss
      ? scaleDecimalToBigInt(params.stopLoss, 30)
      : "";

    const sigs = await this.hook.submitOrder({
      marketToken: market.marketTokenMint,
      collateralToken,
      longToken: market.longToken,
      shortToken: market.shortToken,
      isLong: params.direction === "long",
      orderKind: orderKind as any,
      sizeDeltaUsd: sizeUsd,
      amount,
      triggerPrice,
      takeProfitPrice: tpPrice,
      stopLossPrice: slPrice,
    });

    const sig = sigs?.[0] || "";
    return {
      signature: sig,
      explorerUrl: `https://solscan.io/tx/${sig}?cluster=${GMSOL_NETWORK}`,
    };
  }

  estimateOrder(params: OrderParams): OrderEstimate {
    const leveragedAmount = params.baseAssetAmount * (params.leverage || 1);

    return {
      estimatedFee: {
        maker: leveragedAmount * 0.0002,
        taker: leveragedAmount * 0.0005,
      },
      marginRequired: params.baseAssetAmount,
      estimatedLiquidationPrice: undefined,
    };
  }

  canAffordTrade(
    _amount: number,
    _marketIndex: number,
  ): { canAfford: boolean; reason?: string } {
    // GMSOL sends collateral directly from wallet per-trade
    // The wallet balance check happens at transaction time
    if (!this.hook.privyWallet) {
      return { canAfford: false, reason: "Wallet not connected" };
    }
    return { canAfford: true };
  }

  getPositions(): Position[] {
    return this.hook.positions.map((pos, idx) => {
      const sizeUsd = Number(
        (pos.sizeInUsd || "0").padStart(31, "0").replace(/(\d{30})$/, ".$1"),
      );
      const collateralUsd = Number(
        (pos.collateralAmount || "0")
          .padStart(31, "0")
          .replace(/(\d{30})$/, ".$1"),
      );

      // Find market name
      const actualMarketIndex = this.hook.markets.findIndex(
        (m) => m.marketTokenMint === pos.marketToken,
      );
      const market =
        actualMarketIndex !== -1
          ? this.hook.markets[actualMarketIndex]
          : undefined;

      return {
        marketIndex: actualMarketIndex !== -1 ? actualMarketIndex : idx,
        marketSymbol: market?.name || pos.marketToken.slice(0, 8),
        size: sizeUsd,
        entryPrice: 0, // Requires oracle data
        currentPrice: 0, // Requires oracle data
        unrealizedPnl: 0, // Requires oracle data
        leverage: collateralUsd > 0 ? sizeUsd / collateralUsd : 0,
        liquidationPrice: undefined,
      };
    });
  }

  cleanup(): void {
    // No cleanup needed
  }

  /** Helper: find a market that contains the given token as long or short token */
  private findMarketByToken(
    token: string,
  ): (typeof this.hook.markets)[number] | undefined {
    return this.hook.markets.find(
      (m) =>
        m.longToken === token ||
        m.shortToken === token ||
        m.marketTokenMint === token,
    );
  }
}
