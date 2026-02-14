"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import ProtocolDropDown from "./ProtocolDropDown";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../ui/select";
import Image from "next/image";
import { useProtocol } from "@/features/protocol-adapter/ProtocolContext";
import { useDriftContext } from "@/features/drift/DriftContext";
import type { ExecuteTradeParams, TradeDirection, OrderVariant } from "@/features/drift/types";
import type { ProtocolName } from "@/features/protocol-adapter/types";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

// Map dropdown display names to internal protocol names
const PROTOCOL_NAME_MAP: Record<string, ProtocolName | null> = {
    "All": null,
    "Drift": "drift",
    "Jup Perps": null,
    "Flash": null,
};

const DISPLAY_NAME_MAP: Record<string, string> = {
    drift: "Drift",
    hyperliquid: "Hyperliquid",
    raydium: "Raydium",
    jupiter: "Jup Perps",
};

interface OrderPanelProps {
    baseSymbol: string
    marketIndex: number
}

const TradingOrderPanel = ({ baseSymbol, marketIndex }: OrderPanelProps) => {
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [leverage, setLeverage] = useState(2);
    const [tradeAmount, setTradeAmount] = useState("1");
    const [limitPrice, setLimitPrice] = useState("");
    const [isTrading, setIsTrading] = useState(false);
    const [lastTxUrl, setLastTxUrl] = useState<string | null>(null);
    const { prices } = usePriceFeed([baseSymbol]);

    // Protocol integration
    const { activeProtocol, setProtocol } = useProtocol();
    const drift = useDriftContext();
    const selectedProtocol = activeProtocol
        ? (DISPLAY_NAME_MAP[activeProtocol] ?? "All")
        : "All";

    // Token Selection State
    const [selectedToken, setSelectedToken] = useState("SOL");

    const [reduceOnly, setReduceOnly] = useState<boolean>(false);
    const [postOnly, setPostOnly] = useState<boolean>(false);
    const [tpslEnabled, setTpslEnabled] = useState(false);

    const currentPrice = prices[baseSymbol] || 0;

    // Auto-select Drift when it's initialized and no protocol is active yet
    useEffect(() => {
        if (!activeProtocol && drift.isInitialized && drift.userAccountExists) {
            setProtocol("drift");
        }
    }, [activeProtocol, drift.isInitialized, drift.userAccountExists, setProtocol]);

    // Drift is usable for data/trading when initialized (regardless of activeProtocol)
    // This lets us show estimates even when "All" is selected
    const isDriftReady = drift.isInitialized && drift.userAccountExists === true;

    // --- Drift-derived reactive data ---
    const isProtocolReady = activeProtocol === "drift" && isDriftReady;

    const freeCollateral = useMemo(() => {
        if (!isDriftReady) return 0;
        return drift.getFreeCollateral() ?? 0;
    }, [isDriftReady, drift.getFreeCollateral]);

    const marketInfo = useMemo(() => {
        if (!isDriftReady) return null;
        return drift.getPerpMarketInfo(marketIndex);
    }, [isDriftReady, drift.getPerpMarketInfo, marketIndex]);

    const tradeEstimate = useMemo(() => {
        if (!isDriftReady) return null;
        const amount = parseFloat(tradeAmount) || 0;
        if (amount <= 0) return null;
        const leveragedAmount = amount * leverage;

        // Maker (limit order) fee estimate
        const makerDetails = drift.calculateTradeDetails(
            marketIndex, leveragedAmount, "long" as TradeDirection,
            leverage, "limit" as OrderVariant,
            parseFloat(limitPrice) || undefined,
        );
        // Taker (market order) fee estimate
        const takerDetails = drift.calculateTradeDetails(
            marketIndex, leveragedAmount, "long" as TradeDirection,
            leverage, "market" as OrderVariant,
        );

        const activeDetails = orderType === "limit" ? makerDetails : takerDetails;
        return {
            makerFee: makerDetails?.estimatedFee ?? 0,
            takerFee: takerDetails?.estimatedFee ?? 0,
            makerFeeRate: makerDetails?.feeRate ?? 0,
            takerFeeRate: takerDetails?.feeRate ?? 0,
            liquidationPrice: activeDetails?.liquidationPrice ?? null,
            requiredMargin: activeDetails?.requiredMargin ?? 0,
            positionValue: activeDetails?.positionValue ?? 0,
            entryPrice: activeDetails?.entryPrice ?? 0,
            freeCollateral: activeDetails?.freeCollateral ?? 0,
            canAfford: activeDetails?.canAfford ?? false,
        };
    }, [isDriftReady, drift.calculateTradeDetails, marketIndex, tradeAmount, leverage, orderType, limitPrice]);

    const formatPrice = (price: number | null | undefined): string => {
        if (!price || isNaN(price)) return "-";
        if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    const handleProtocolChange = useCallback((displayName: string) => {
        const protocolName = PROTOCOL_NAME_MAP[displayName] ?? null;
        setProtocol(protocolName);
    }, [setProtocol]);

    const handleTrade = useCallback(async (direction: TradeDirection) => {
        if (!isProtocolReady) {
            toast.error("Protocol not ready. Please connect your wallet and select a protocol.");
            return;
        }

        const amount = parseFloat(tradeAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid trade amount.");
            return;
        }

        // If user entered size in USDC, convert to base asset using current price
        let baseAmount = amount;
        if (selectedToken === "USDC") {
            if (!currentPrice || currentPrice <= 0) {
                toast.error("Cannot convert USDC to base asset: market price unavailable.");
                return;
            }
            baseAmount = amount / currentPrice;
        }

        const leveragedAmount = baseAmount * leverage;

        // Pre-trade affordability check
        const affordCheck = drift.canAffordTrade(leveragedAmount, marketIndex);
        if (!affordCheck.canAfford) {
            toast.error(affordCheck.reason ?? "Insufficient collateral for this trade.");
            return;
        }

        if (orderType === "limit") {
            const price = parseFloat(limitPrice);
            if (isNaN(price) || price <= 0) {
                toast.error("Please enter a valid limit price.");
                return;
            }
        }

        const params: ExecuteTradeParams = {
            marketIndex,
            direction,
            baseAssetAmount: leveragedAmount,
            orderVariant: orderType as OrderVariant,
            reduceOnly,
            postOnly: orderType === "limit" ? postOnly : false,
            subAccountId: 0,
        };

        if (orderType === "limit") {
            params.price = parseFloat(limitPrice);
        }

        setIsTrading(true);
        setLastTxUrl(null);
        try {
            const result = await drift.placeOrder(params);
            const explorerUrl = result?.explorerUrl ?? null;
            setLastTxUrl(explorerUrl);
            toast.success("Order placed!", {
                description: explorerUrl ? "View transaction on Solscan" : undefined,
                action: explorerUrl ? {
                    label: "Open",
                    onClick: () => window.open(explorerUrl, "_blank"),
                } : undefined,
                duration: 8000,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toast.error(`Trade failed: ${message}`);
        } finally {
            setIsTrading(false);
        }
    }, [isProtocolReady, tradeAmount, selectedToken, currentPrice, leverage, drift, marketIndex, orderType, limitPrice, reduceOnly, postOnly]);

    return (
        <div className="w-full space-y-4 text-sm border p-2">
            {/* FILTER BAR */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-9 flex items-center justify-center text-xs font-medium">
                    <ProtocolDropDown
                        selectedProtocol={selectedProtocol}
                        onProtocolChange={handleProtocolChange}
                    />
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
                <div className="flex flex-row items-center justify-between px-1">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Market Price</span>
                        <div className="text-lg font-medium text-foreground font-ibm">{formatPrice(currentPrice)}</div>
                    </div>
                    {/* AVAILABLE MARGIN */}
                    <div className="space-y-1 text-end">
                        <span className="text-xs text-muted-foreground">Avail Margin</span>
                        <div className="text-lg font-medium text-foreground font-ibm">
                            {isProtocolReady ? formatPrice(freeCollateral) : "-"}
                        </div>
                    </div>
                </div>

                {/* LIMIT PRICE INPUT (shown when limit order selected) */}
                {orderType === "limit" && (
                    <div className="space-y-1">
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

            <Separator />

            {/* SIZE with TOKEN SELECTION */}
            <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Size</span>
                <div className="flex items-center gap-2 py-1">
                    <Input
                        type="number"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-9 w-full bg-transparent text-lg font-medium border dark:border-white/10 border-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    {/* Token Select Dropdown - Blue BG, White Text, Height Matched */}
                    <Select value={selectedToken} onValueChange={setSelectedToken}>
                        <SelectTrigger className="h-10 w-28 shrink-0 ">
                            <SelectValue placeholder="Token" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SOL">
                                <Image
                                    src={"https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg"}
                                    alt=""
                                    width={25}
                                    height={25}
                                />
                                SOL</SelectItem>
                            <SelectItem value="USDC">
                                <Image
                                    src={"https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/usdc.svg"}
                                    alt=""
                                    width={25}
                                    height={25}
                                />
                                USDC</SelectItem>
                        </SelectContent>
                    </Select>
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

            {/* ORDER OPTIONS */}
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
                <div className="space-y-3 pt-1.5 animate-in slide-in-from-top-1 fade-in duration-200">

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

            <Separator />

            {/* PRE-TRADE STATS */}
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
                            ? `${(parseFloat(tradeAmount) * leverage || 0).toFixed(4)} ${baseSymbol}`
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
                                (marketInfo.openInterestLong + marketInfo.openInterestShort)
                                * (marketInfo.oraclePrice || 0)
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

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                    onClick={() => handleTrade("long")}
                    disabled={!isProtocolReady || isTrading}
                    className="h-10 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-none"
                    variant="outline"
                >
                    {isTrading ? "Placing..." : "Long"}
                </Button>
                <Button
                    onClick={() => handleTrade("short")}
                    disabled={!isProtocolReady || isTrading}
                    className="h-10 border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 rounded-none"
                    variant="outline"
                >
                    {isTrading ? "Placing..." : "Short"}
                </Button>
            </div>

            {/* LAST TX LINK
            {lastTxUrl && (
                <a
                    href={lastTxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors py-1"
                >
                    <ExternalLink className="h-3 w-3" />
                    View last transaction on Solscan
                </a>
            )} */}
        </div>
    );
};

export default TradingOrderPanel;