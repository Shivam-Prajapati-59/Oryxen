interface TradeEstimate {
    makerFee: number | null;
    takerFee: number | null;
    makerFeeRate: number | null;
    takerFeeRate: number | null;
    liquidationPrice: number | null;
    requiredMargin: number;
    positionValue: number;
    entryPrice: number;
    freeCollateral: number;
    canAfford: boolean;
}

interface PreTradeStatsProps {
    tradeEstimate: TradeEstimate | null;
    baseSymbol: string;
    orderType: "market" | "limit";
    formatPrice: (price: number | null | undefined) => string;
    currentPrice: number;
}

export function PreTradeStats({
    tradeEstimate,
    baseSymbol,
    orderType,
    formatPrice,
    currentPrice
}: PreTradeStatsProps) {
    const activeFee = orderType === "market"
        ? tradeEstimate?.takerFee ?? null
        : tradeEstimate?.makerFee ?? null;
    const activeFeeRate = orderType === "market"
        ? tradeEstimate?.takerFeeRate ?? null
        : tradeEstimate?.makerFeeRate ?? null;

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
                    {tradeEstimate && currentPrice > 0
                        ? (() => {
                            const size = tradeEstimate.positionValue / currentPrice;
                            return `${size.toFixed(4)} ${baseSymbol}`;
                        })()
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

                <span>Price Impact</span>
                <span className={`font-mono font-medium ${tradeEstimate && Math.abs(tradeEstimate.entryPrice - currentPrice) / currentPrice > 0.01 ? "text-yellow-500" : "text-foreground"}`}>
                    {tradeEstimate && currentPrice > 0
                        ? `${((Math.abs(tradeEstimate.entryPrice - currentPrice) / currentPrice) * 100).toFixed(3)}%`
                        : "-"}
                </span>
            </div>
            <div className="flex justify-between">
                <span>Fees ({orderType === "market" ? "Taker" : "Maker"})</span>
                <span className="text-foreground font-mono font-medium">
                    {tradeEstimate && activeFee !== null && activeFeeRate !== null
                        ? <>
                            ${activeFee.toFixed(4)}
                            <span className="text-xs text-muted-foreground ml-1">
                                ({(activeFeeRate * 100).toFixed(3)}%)
                            </span>
                        </>
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
