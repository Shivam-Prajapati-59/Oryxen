interface TradeEstimate {
    makerFee: number;
    takerFee: number;
    makerFeeRate: number;
    takerFeeRate: number;
    liquidationPrice: number | null;
    requiredMargin: number;
    positionValue: number;
    entryPrice: number;
    freeCollateral: number;
    canAfford: boolean;
}

interface PreTradeStatsProps {
    tradeEstimate: TradeEstimate | null;
    tradeAmount: string;
    leverage: number;
    baseSymbol: string;
    orderType: "market" | "limit";
    marketInfo: any | null; // From Drift
    formatPrice: (price: number | null | undefined) => string;
}

export function PreTradeStats({
    tradeEstimate,
    tradeAmount,
    leverage,
    baseSymbol,
    orderType,
    marketInfo,
    formatPrice
}: PreTradeStatsProps) {
    return (
        <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
                <span>Margin Required</span>
                <span className={`text-foreground font-mono font-medium ${tradeEstimate && !tradeEstimate.canAfford ? "text-red-500" : ""}`}>
                    {tradeEstimate
                        ? `$${tradeEstimate.requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "-"}
                </span>
            </div>
            <div className="flex justify-between">
                <span>Order Size</span>
                <span className="text-foreground font-mono font-medium">
                    {tradeEstimate
                        ? `${(parseFloat(tradeAmount) * leverage || 0).toFixed(4)} SOL`
                        : "-"}
                </span>
            </div>
            <div className="flex justify-between">
                <span>Position Value</span>
                <span className="text-foreground font-mono font-medium">
                    {tradeEstimate
                        ? `$${tradeEstimate.positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "-"}
                </span>
            </div>
            <div className="flex justify-between">
                <span>Fees ({orderType === "market" ? "Taker" : "Maker"})</span>
                <span className="text-foreground font-mono font-medium">
                    {tradeEstimate
                        ? <>
                            ${orderType === "market"
                                ? tradeEstimate.takerFee.toFixed(4)
                                : tradeEstimate.makerFee.toFixed(4)}
                            <span className="text-xs text-muted-foreground ml-1">
                                ({(orderType === "market"
                                    ? tradeEstimate.takerFeeRate * 100
                                    : tradeEstimate.makerFeeRate * 100
                                ).toFixed(3)}%)
                            </span>
                        </>
                        : "-"}
                </span>
            </div>
            <div className="flex justify-between">
                <span>Open Interest</span>
                <span className="text-emerald-500 font-mono font-medium">
                    {marketInfo
                        ? formatPrice(
                            ((marketInfo.openInterestLong ?? 0) + (marketInfo.openInterestShort ?? 0))
                            * (marketInfo.oraclePrice ?? 0)
                        )
                        : "-"}
                </span>
            </div>
            <div className="flex justify-between">
                <span>Est. Liquidation</span>
                <span className="text-red-500 font-mono font-medium">
                    {tradeEstimate?.liquidationPrice
                        ? formatPrice(tradeEstimate.liquidationPrice)
                        : "-"}
                </span>
            </div>

            {/* Insufficient margin warning */}
            {tradeEstimate && !tradeEstimate.canAfford && (
                <p className="text-xs text-red-500 pt-1">
                    Insufficient margin — ${tradeEstimate.freeCollateral.toFixed(2)} free, need ${tradeEstimate.requiredMargin.toFixed(2)}
                </p>
            )}
        </div>
    );
}
