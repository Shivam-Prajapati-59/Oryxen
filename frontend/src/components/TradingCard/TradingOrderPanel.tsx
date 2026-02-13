"use client";

import React, { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import ProtocolDropDown from "./ProtocolDropDown";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface OrderPanelProps {
    baseSymbol: string
    marketIndex: number
}

// Helper types for TP/SL
type InputMode = 'percent' | 'price';

const TradingOrderPanel = ({ baseSymbol, marketIndex }: OrderPanelProps) => {
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [leverage, setLeverage] = useState(2);
    const [selectedProtocol, setSelectedProtocol] = useState("All");
    const { prices } = usePriceFeed([baseSymbol]);

    const [selectedToken, setSelectedToken] = useState("SOL")
    const [reduceOnly, setReduceOnly] = useState<boolean>(false);
    const [postOnly, setPostOnly] = useState<boolean>(false);

    // Unified TP/SL State
    const [tpslEnabled, setTpslEnabled] = useState(false);
    const [tpValue, setTpValue] = useState("");
    const [tpMode, setTpMode] = useState<InputMode>("percent");
    const [slValue, setSlValue] = useState("");
    const [slMode, setSlMode] = useState<InputMode>("percent");

    const currentPrice = prices[baseSymbol] || 0;

    const formatPrice = (price: number | null | undefined): string => {
        if (!price || isNaN(price)) return "-";
        if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    // Calculate estimated target price or ROI for display
    const getEstValue = (value: string, mode: InputMode, type: 'tp' | 'sl') => {
        if (!currentPrice || !value) return "-";
        const numVal = parseFloat(value);
        if (isNaN(numVal)) return "-";

        if (mode === 'percent') {
            const price = type === 'tp'
                ? currentPrice * (1 + numVal / 100)
                : currentPrice * (1 - numVal / 100);
            return `$${price.toFixed(2)}`;
        } else {
            const diff = Math.abs(numVal - currentPrice);
            const roi = (diff / currentPrice) * 100;
            return `${roi.toFixed(2)}%`;
        }
    };

    return (
        <div className="w-full space-y-4 text-sm border p-2">
            {/* FILTER BAR */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-9 flex items-center justify-center text-xs font-medium">
                    <ProtocolDropDown
                        selectedProtocol={selectedProtocol}
                        onProtocolChange={setSelectedProtocol}
                    />
                </div>

                <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9"
                >
                    <Settings className="h-4 w-4" />
                </Button>
                {marketIndex}
            </div>

            <Separator />

            {/* MARKET / LIMIT */}
            <div className="space-y-3">
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

                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Market Price</span>
                    <div className="text-lg font-medium text-foreground font-ibm">{formatPrice(currentPrice)}</div>
                </div>
            </div>

            <Separator />

            {/* SIZE */}
            <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Size</span>
                <div className="flex items-center justify-between py-2">
                    <Input
                        type="number"
                        defaultValue={11}
                        className="w-full bg-transparent text-lg font-medium border dark:border-white/10 border-black/20 py-0.5"
                    />
                    <Button className="ml-3 flex items-center gap-1 rounded-md px-2 py-0.5">
                        <span className="flex items-center gap-1">{selectedToken}</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                </div>
            </div>

            <Separator />

            {/* AVAILABLE MARGIN */}
            <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Avail. Margin (min. 10 USDC)</span>
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
                <Slider
                    value={[((leverage - 2) * 100) / (100 - 2)]}
                    onValueChange={(value) => {
                        const newLeverage = Math.round(2 + ((100 - 2) * value[0]) / 100);
                        setLeverage(newLeverage);
                    }}
                    max={100}
                    step={1}
                    className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>2x</span><span>10x</span><span>25x</span><span>50x</span><span>100x</span>
                </div>
            </div>

            <Separator />

            {/* ORDER OPTIONS (Unified Row) */}
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

                {/* TP/SL Toggle matches Reduce Only style */}
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

            {/* EXPANDED TP/SL SECTION (Integrated Design) */}
            {tpslEnabled && (
                <div className="space-y-3 pt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                    {/* Take Profit */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-emerald-500 font-medium">Take Profit</span>
                            <span className="text-muted-foreground">
                                {tpMode === 'percent' ? 'Est. Price: ' : 'Est. ROI: '}
                                <span className="font-mono text-foreground">{getEstValue(tpValue, tpMode, 'tp')}</span>
                            </span>
                        </div>
                        <div className="flex">
                            <Input
                                type="number"
                                value={tpValue}
                                onChange={(e) => setTpValue(e.target.value)}
                                placeholder={tpMode === 'percent' ? "ROI %" : "Price"}
                                className="rounded-r-none border-r-0 bg-transparent dark:border-white/10 border-black/20"
                            />
                            <Select value={tpMode} onValueChange={(v) => setTpMode(v as InputMode)}>
                                <SelectTrigger className="w-[80px] rounded-l-none bg-muted/20 border-l dark:border-white/10 border-black/20 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percent">%</SelectItem>
                                    <SelectItem value="price">USDC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Stop Loss */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-red-500 font-medium">Stop Loss</span>
                            <span className="text-muted-foreground">
                                {slMode === 'percent' ? 'Est. Price: ' : 'Est. ROI: '}
                                <span className="font-mono text-foreground">{getEstValue(slValue, slMode, 'sl')}</span>
                            </span>
                        </div>
                        <div className="flex">
                            <Input
                                type="number"
                                value={slValue}
                                onChange={(e) => setSlValue(e.target.value)}
                                placeholder={slMode === 'percent' ? "ROI %" : "Price"}
                                className="rounded-r-none border-r-0 bg-transparent dark:border-white/10 border-black/20"
                            />
                            <Select value={slMode} onValueChange={(v) => setSlMode(v as InputMode)}>
                                <SelectTrigger className="w-[80px] rounded-l-none bg-muted/20 border-l dark:border-white/10 border-black/20 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percent">%</SelectItem>
                                    <SelectItem value="price">USDC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

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