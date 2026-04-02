import { Input } from "@/components/ui/input";
import { Dispatch, SetStateAction } from "react";

interface OrderTypeSelectorProps {
    orderType: "market" | "limit";
    setOrderType: Dispatch<SetStateAction<"market" | "limit">>;
    currentPrice: number;
    limitPrice: string;
    setLimitPrice: Dispatch<SetStateAction<string>>;
    freeCollateral: number;
    activeProtocol: string | null;
    isProtocolReady: boolean;
    isGmxsolReady: boolean;
    formatPrice: (price: number | null | undefined) => string;
}

export function OrderTypeSelector({
    orderType,
    setOrderType,
    currentPrice,
    limitPrice,
    setLimitPrice,
    freeCollateral,
    activeProtocol,
    isProtocolReady,
    isGmxsolReady,
    formatPrice
}: OrderTypeSelectorProps) {
    return (
        <div>
            <div className="flex w-full gap-2">
                <button
                    onClick={() => setOrderType("market")}
                    className={`flex-1 h-10 text-md font-medium rounded-md border transition-colors ${orderType === "market"
                        ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-500 border-emerald-700/30"
                        : "border-border hover:bg-accent"
                        }`}
                >
                    Market
                </button>

                <button
                    onClick={() => setOrderType("limit")}
                    className={`flex-1 h-10 text-md font-medium rounded-md border transition-colors ${orderType === "limit"
                        ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-500 border-emerald-700/30"
                        : "border-border hover:bg-accent"
                        }`}
                >
                    Limit
                </button>
            </div>

            <div className="flex flex-row items-center justify-between px-1 mt-2">
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Market Price</span>
                    <div className="text-lg font-medium text-foreground font-ibm">
                        {formatPrice(currentPrice)}
                    </div>
                </div>
                {/* AVAILABLE MARGIN */}
                <div className="space-y-1 text-end">
                    <span className="text-xs text-muted-foreground">
                        Avail Margin
                    </span>
                    <div className="text-lg font-medium text-foreground font-ibm">
                        {activeProtocol === "GMXSol"
                            ? (isGmxsolReady ? formatPrice(freeCollateral) : "-")
                            : isProtocolReady ? formatPrice(freeCollateral) : "-"}
                    </div>
                </div>
            </div>

            {/* LIMIT PRICE INPUT (shown when limit order selected) */}
            {orderType === "limit" && (
                <div className="space-y-1 mt-2">
                    <span className="text-xs text-muted-foreground">Limit Price</span>
                    <Input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder={formatPrice(currentPrice)}
                        className="h-9 w-full bg-transparent text-lg font-medium border dark:border-white/10 border-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
            )}
        </div>
    );
}
