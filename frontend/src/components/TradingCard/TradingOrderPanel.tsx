"use client";

import React, { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

const TradingOrderPanel = () => {
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [leverage, setLeverage] = useState(2);

    return (
        <div className="w-full space-y-4 text-sm border p-2">
            {/* FILTER BAR */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-9 border flex items-center justify-center text-xs font-medium">
                    All
                </div>

                <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </div>

            <Separator />

            {/* MARKET / LIMIT */}
            <div className="space-y-3">
                <div className="flex gap-1">
                    <button
                        onClick={() => setOrderType("market")}
                        className={`h-7 px-3 text-xs border transition-colors ${orderType === "market"
                            ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30"
                            : "border-border hover:bg-accent"
                            }`}
                    >
                        Market
                    </button>
                    <button
                        onClick={() => setOrderType("limit")}
                        className={`h-7 px-3 text-xs border transition-colors ${orderType === "limit"
                            ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30"
                            : "border-border hover:bg-accent"
                            }`}
                    >
                        Limit
                    </button>
                </div>

                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Market Price</span>
                    <div className="text-lg font-medium text-foreground">$142.9977</div>
                </div>
            </div>

            <Separator />

            {/* SIZE */}
            <div className="space-y-2">
                <span className="text-md text-foreground">Size</span>

                <div className="flex items-center justify-between h-9 border px-3">
                    <button className="flex items-center gap-1 text-xs text-foreground hover:text-muted-foreground transition-colors">
                        SOL <ChevronDown className="h-4 w-4" />
                    </button>
                </div>

                <span className="text-xs text-muted-foreground">~$143 USDC</span>
            </div>

            <Separator />

            {/* AVAILABLE MARGIN */}
            <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                    Avail. Margin (min. 10 USDC)
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-foreground">71.39</span>
                    <span className="text-xs text-muted-foreground">USDC</span>
                </div>
            </div>

            <Separator />

            {/* LEVERAGE */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Leverage</span>
                    <span className="text-base text-foreground font-medium">{leverage}x</span>
                </div>

                {/* SLIDER */}
                <input
                    type="range"
                    min="2"
                    max="100"
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full h-1 rounded-full bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                />

                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>2x</span>
                    <span>10x</span>
                    <span>25x</span>
                    <span>50x</span>
                    <span>100x</span>
                </div>
            </div>

            <Separator />

            {/* STATS */}
            <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Fee</span>
                    <span className="text-foreground">
                        <span className="text-emerald-500">$0.08</span> / <span className="text-red-500">$0.09</span>
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Avbl. Liquidity</span>
                    <span className="text-emerald-500">$6,544,027</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Liquidation</span>
                    <span className="text-red-500">$71.65</span>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                    className="h-10 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-none"
                    variant="outline"
                >
                    Long
                </Button>
                <Button
                    className="h-10 border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 rounded-none"
                    variant="outline"
                >
                    Short
                </Button>
            </div>
        </div>
    );
};

export default TradingOrderPanel;
