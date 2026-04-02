import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dispatch, SetStateAction } from "react";

interface OrderOptionsSelectorProps {
    orderType: "market" | "limit";
    reduceOnly: boolean;
    setReduceOnly: Dispatch<SetStateAction<boolean>>;
    postOnly: boolean;
    setPostOnly: Dispatch<SetStateAction<boolean>>;
    tpslEnabled: boolean;
    setTpslEnabled: Dispatch<SetStateAction<boolean>>;
    takeProfitPrice: string;
    setTakeProfitPrice: Dispatch<SetStateAction<string>>;
    stopLossPrice: string;
    setStopLossPrice: Dispatch<SetStateAction<string>>;
    currentPrice: number | null;
    tradeAmount: string;
    leverage: number;
}

export function OrderOptionsSelector({
    orderType,
    reduceOnly,
    setReduceOnly,
    postOnly,
    setPostOnly,
    tpslEnabled,
    setTpslEnabled,
    takeProfitPrice,
    setTakeProfitPrice,
    stopLossPrice,
    setStopLossPrice,
    currentPrice,
    tradeAmount,
    leverage
}: OrderOptionsSelectorProps) {

    const positionSize = parseFloat(tradeAmount) * leverage || 0;
    const tpPriceNum = parseFloat(takeProfitPrice);
    const slPriceNum = parseFloat(stopLossPrice);

    const tpGain = (takeProfitPrice && currentPrice && !isNaN(tpPriceNum))
        ? ((tpPriceNum - currentPrice) * positionSize).toFixed(2)
        : "";
    const slLoss = (stopLossPrice && currentPrice && !isNaN(slPriceNum))
        ? ((currentPrice - slPriceNum) * positionSize).toFixed(2)
        : "";

    return (
        <>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="reduce-only"
                        checked={reduceOnly}
                        onCheckedChange={(checked) => setReduceOnly(!!checked)}
                    />
                    <Label htmlFor="reduce-only" className="text-sm font-medium leading-none cursor-pointer">
                        Reduce Only
                    </Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="tpsl-toggle"
                        checked={tpslEnabled}
                        onCheckedChange={(checked) => setTpslEnabled(!!checked)}
                    />
                    <Label htmlFor="tpsl-toggle" className="text-sm font-medium leading-none cursor-pointer">
                        TP / SL
                    </Label>
                </div>

                {orderType === "limit" && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="post-only"
                            checked={postOnly}
                            onCheckedChange={(checked) => setPostOnly(!!checked)}
                        />
                        <Label htmlFor="post-only" className="text-sm font-medium leading-none cursor-pointer">
                            Post Only
                        </Label>
                    </div>
                )}
            </div>

            {/* EXPANDED TP/SL SECTION */}
            {tpslEnabled && (
                <div className="space-y-2 pt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    {/* --- Take Profit Section --- */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-base">
                            <span className="font-medium text-emerald-500">Take Profit</span>
                        </div>

                        <div className="flex flex-row gap-3">
                            <div className="relative w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs uppercase font-bold tracking-wider">
                                    TP
                                </span>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={takeProfitPrice}
                                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                                    className="h-9 w-full bg-transparent pl-10 text-right text-base font-medium border dark:border-white/10 border-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>

                            <div className="relative w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs uppercase font-bold tracking-wider">
                                    Gain
                                </span>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    readOnly
                                    value={tpGain}
                                    className="h-9 w-full bg-transparent pl-12 pr-8 text-right text-base font-medium border dark:border-white/10 border-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                    $
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- Stop Loss Section --- */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-base">
                            <span className="font-medium text-red-500">Stop Loss</span>
                        </div>

                        <div className="flex flex-row gap-3">
                            <div className="relative w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs uppercase font-bold tracking-wider">
                                    SL
                                </span>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={stopLossPrice}
                                    onChange={(e) => setStopLossPrice(e.target.value)}
                                    className="h-9 w-full bg-transparent pl-10 text-right text-base font-medium border dark:border-white/10 border-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>

                            <div className="relative w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs uppercase font-bold tracking-wider">
                                    Loss
                                </span>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    readOnly
                                    value={slLoss}
                                    className="h-9 w-full bg-transparent pl-12 pr-8 text-right text-base font-medium border dark:border-white/10 border-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                    $
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
