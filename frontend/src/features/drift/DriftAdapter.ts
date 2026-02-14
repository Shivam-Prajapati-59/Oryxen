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
import { useDrift } from "./hooks/useDrift";

/**
 * Drift Protocol Adapter
 * Wraps the useDrift hook to conform to IProtocolAdapter interface
 */
export class DriftAdapter implements IProtocolAdapter {
  readonly name: ProtocolName = "drift";
  readonly displayName = "Drift Protocol";

  private driftHook: ReturnType<typeof useDrift>;

  constructor(driftHook: ReturnType<typeof useDrift>) {
    this.driftHook = driftHook;
  }

  /** Update the hook reference (called every render to keep data fresh) */
  updateHook(hook: ReturnType<typeof useDrift>): void {
    this.driftHook = hook;
  }

  get isInitialized(): boolean {
    return this.driftHook.isInitialized;
  }

  get isLoading(): boolean {
    return this.driftHook.isLoading;
  }

  get error(): string | null {
    return this.driftHook.error;
  }

  get userAccountExists(): boolean | null {
    return this.driftHook.userAccountExists;
  }

  async initialize(): Promise<void> {
    await this.driftHook.initializeDriftClient();
  }

  async initializeUserAccount(): Promise<void> {
    await this.driftHook.initializeUserAccount(0, "Trading Account");
  }

  async deposit(amount: number, token: string): Promise<TradeResult> {
    const result = await this.driftHook.deposit(amount, token, 0);
    if (!result) throw new Error("Deposit failed");
    return {
      signature: result.txSig,
      explorerUrl: result.explorerUrl,
    };
  }

  async withdraw(amount: number, token: string): Promise<TradeResult> {
    const result = await this.driftHook.withdraw(amount, token, false, 0);
    if (!result) throw new Error("Withdrawal failed");
    return {
      signature: result.txSig,
      explorerUrl: result.explorerUrl,
    };
  }

  getCollateralInfo(): CollateralInfo {
    const freeCollateral = this.driftHook.getFreeCollateral();
    const totalCollateral = this.driftHook.getTotalCollateral();

    return {
      totalCollateral: totalCollateral || 0,
      freeCollateral: freeCollateral || 0,
      marginUsed: (totalCollateral || 0) - (freeCollateral || 0),
    };
  }

  getMarketInfo(marketIndex: number): MarketInfo {
    const info = this.driftHook.getPerpMarketInfo(marketIndex);

    // Compute maxLeverage from on-chain margin ratio (not hardcoded)
    let maxLeverage: number | undefined;
    try {
      const client = this.driftHook.driftClient;
      if (client) {
        const market = client.getPerpMarketAccount(marketIndex);
        if (market && market.marginRatioInitial > 0) {
          maxLeverage = 10_000 / market.marginRatioInitial;
        }
      }
    } catch {
      /* fallback to undefined */
    }

    return {
      price: info?.oraclePrice || 0,
      fundingRate: info?.fundingRate8h,
      maxLeverage,
    };
  }

  getMarketPrice(marketIndex: number): number {
    return this.driftHook.getOraclePrice(marketIndex) || 0;
  }

  async placeOrder(params: OrderParams): Promise<TradeResult> {
    const leveragedAmount = params.baseAssetAmount * (params.leverage || 1);

    const orderParams: any = {
      marketIndex: params.marketIndex,
      direction: params.direction,
      baseAssetAmount: leveragedAmount,
      orderVariant: params.orderType,
      reduceOnly: params.reduceOnly || false,
      postOnly: params.postOnly || false,
      subAccountId: 0,
    };

    if (params.price) {
      orderParams.price = params.price;
    }

    if (params.triggerPrice) {
      orderParams.triggerPrice = params.triggerPrice;
    }

    const result = await this.driftHook.placeOrder(orderParams);
    if (!result) throw new Error("Order placement failed");

    return {
      signature: result.txSig,
      explorerUrl: result.explorerUrl,
    };
  }

  estimateOrder(params: OrderParams): OrderEstimate {
    const leveragedAmount = params.baseAssetAmount * (params.leverage || 1);

    // Compute both maker (limit) and taker (market) fee estimates
    const makerDetails = this.driftHook.calculateTradeDetails(
      params.marketIndex,
      leveragedAmount,
      params.direction,
      params.leverage || 1,
      "limit",
      params.price,
    );
    const takerDetails = this.driftHook.calculateTradeDetails(
      params.marketIndex,
      leveragedAmount,
      params.direction,
      params.leverage || 1,
      "market",
    );

    const isTaker =
      params.orderType === "market" || params.orderType === "takeProfit";
    const details = isTaker ? takerDetails : makerDetails;

    return {
      estimatedFee: {
        maker: makerDetails?.estimatedFee ?? 0,
        taker: takerDetails?.estimatedFee ?? 0,
      },
      estimatedLiquidationPrice: details?.liquidationPrice ?? undefined,
      marginRequired: details?.requiredMargin ?? 0,
    };
  }

  canAffordTrade(
    amount: number,
    marketIndex: number,
  ): {
    canAfford: boolean;
    reason?: string;
  } {
    return this.driftHook.canAffordTrade(amount, marketIndex);
  }

  getPositions(): Position[] {
    const positions = this.driftHook.getPositions();
    const totalCollateral = this.driftHook.getTotalCollateral() || 0;
    return positions.map((pos) => ({
      marketIndex: pos.marketIndex,
      marketSymbol: pos.marketName,
      size: pos.size,
      entryPrice: pos.entryPrice,
      currentPrice: pos.markPrice,
      unrealizedPnl: pos.unrealizedPnl,
      leverage: totalCollateral > 0 ? pos.notionalValue / totalCollateral : 0,
      liquidationPrice: pos.liquidationPrice,
    }));
  }

  cleanup(): void {
    // Cleanup logic if needed
  }
}
