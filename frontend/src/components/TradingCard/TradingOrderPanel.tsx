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

import { useProtocol } from "@/features/protocol-adapter/ProtocolContext";
import { useDriftContext } from "@/features/drift/DriftContext";
import { useGmxsolContext } from "@/features/gmxsol/GmxsolContext";
import type { ExecuteTradeParams, TradeDirection, OrderVariant } from "@/features/drift/types";
import type { ProtocolName, OrderType as GenericOrderType } from "@/features/protocol-adapter/types";
import { toast } from "sonner";

/** Detect wallet‑rejected / user‑cancelled errors so we can show a gentle toast instead of a red error. */
function isUserCancellation(err: unknown): boolean {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return (
        msg.includes("user rejected") ||
        msg.includes("user denied") ||
        msg.includes("cancelled") ||
        msg.includes("canceled") ||
        msg.includes("rejected the request") ||
        msg.includes("user refused")
    );
}

// Map dropdown display names to internal protocol names
const PROTOCOL_NAME_MAP: Record<string, ProtocolName | null> = {
    "Drift": "drift",
    "GMXSol": "GMXSol",
};

const DISPLAY_NAME_MAP: Record<string, string> = {
    drift: "Drift",
    GMXSol: "GMXSol"
};

interface OrderPanelProps {
    baseSymbol: string
    marketIndex: number
}

/** Scale a decimal string (e.g. "155.50") to a BigInt with `decimals` fractional digits. */
function scaleDecimalToBigInt(value: string, decimals: number): string {
    const [intPart, fracPart = ""] = value.split(".");
    const paddedFrac = fracPart.slice(0, decimals).padEnd(decimals, "0");
    return BigInt(intPart + paddedFrac).toString();
}

const TradingOrderPanel = ({ baseSymbol, marketIndex }: OrderPanelProps) => {
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [leverage, setLeverage] = useState(2);
    const [tradeAmount, setTradeAmount] = useState("1");
    const [limitPrice, setLimitPrice] = useState("");
    const [isTrading, setIsTrading] = useState(false);
    const [lastTxUrl, setLastTxUrl] = useState<string | null>(null);
    const { prices } = usePriceFeed([baseSymbol, "SOL"]);

    // Protocol integration
    const { activeProtocol, adapter, setProtocol } = useProtocol();
    const drift = useDriftContext();
    const gmsol = useGmxsolContext();
    const selectedProtocol = activeProtocol
        ? (DISPLAY_NAME_MAP[activeProtocol] ?? "All")
        : "All";

    // Token Selection State
    const [selectedToken, setSelectedToken] = useState("SOL");

    const [reduceOnly, setReduceOnly] = useState<boolean>(false);
    const [postOnly, setPostOnly] = useState<boolean>(false);
    const [tpslEnabled, setTpslEnabled] = useState(false);
    const [takeProfitPrice, setTakeProfitPrice] = useState("");
    const [stopLossPrice, setStopLossPrice] = useState("");
    const [selectedDirection, setSelectedDirection] = useState<TradeDirection>("long");

    const currentPrice = prices[baseSymbol] || 0;
    const solPrice = prices["SOL"] || 0;

    // Auto-select Drift when it's initialized and no protocol is active yet
    useEffect(() => {
        if (!activeProtocol && drift.isInitialized && drift.userAccountExists) {
            setProtocol("drift");
        }
    }, [activeProtocol, drift.isInitialized, drift.userAccountExists, setProtocol]);

    // Drift is usable for data/trading when initialized (regardless of activeProtocol)
    // This lets us show estimates even when "All" is selected
    const isDriftReady = drift.isInitialized && drift.userAccountExists === true;
    const isGmxsolReady = !!gmsol.privyWallet && !!gmsol.program;

    // --- Protocol-derived reactive data ---
    const isProtocolReady =
        (activeProtocol === "drift" && isDriftReady) ||
        (activeProtocol === "GMXSol" && isGmxsolReady);

    // Use Privy wallet balance for margin display (user's actual available funds)
    const freeCollateral = useMemo(() => {
        if (activeProtocol === "GMXSol") {
            // GMSOL uses wallet SOL balance as collateral, convert to USD
            return gmsol.walletBalance * solPrice;
        }
        // For Drift, use Privy wallet balance (what user can actually deposit/use)
        // This is more intuitive than showing Drift sub-account balance
        return drift.walletBalance * solPrice;
    }, [activeProtocol, drift.walletBalance, gmsol.walletBalance, solPrice]);

    const marketInfo = useMemo(() => {
        if (!isDriftReady) return null;
        return drift.getPerpMarketInfo(marketIndex);
    }, [isDriftReady, drift.getPerpMarketInfo, marketIndex]);

    const tradeEstimate = useMemo(() => {
        const amount = parseFloat(tradeAmount) || 0;
        if (amount <= 0) return null;

        // Convert SOL input → market's base asset units
        // SOL-PERP: solPrice/currentPrice ≈ 1 (no-op)
        // ETH-PERP: (1 SOL × $150) / $3500 = 0.0428 ETH
        const baseInMarketUnits = (currentPrice > 0 && solPrice > 0)
            ? (amount * solPrice) / currentPrice
            : amount;
        const leveragedAmount = baseInMarketUnits * leverage;

        if (activeProtocol === "GMXSol") {
            if (!isGmxsolReady) return null;
            // For GMXSol, use their calculateTradeDetails with actual direction
            const activeDetails = gmsol.calculateTradeDetails(
                baseSymbol, // market symbol
                amount,
                selectedDirection,
                leverage,
                orderType === "limit" ? "limit" : "market",
                parseFloat(limitPrice) || undefined,
                solPrice, // Pass SOL price for margin calculations
            );
            return {
                makerFee: activeDetails?.estimatedFee ?? 0,
                takerFee: activeDetails?.estimatedFee ?? 0,
                makerFeeRate: activeDetails?.feeRate ?? 0,
                takerFeeRate: activeDetails?.feeRate ?? 0,
                liquidationPrice: activeDetails?.liquidationPrice ?? null,
                requiredMargin: activeDetails?.requiredMargin ?? 0,
                positionValue: activeDetails?.positionValue ?? 0,
                entryPrice: activeDetails?.entryPrice ?? 0,
                freeCollateral: activeDetails?.freeCollateral ?? 0,
                canAfford: activeDetails?.canAfford ?? false,
            };
        } else {
            if (!isDriftReady) return null;
            // Calculate wallet balance in USD for canAfford check
            const walletBalanceUsd = drift.walletBalance * solPrice;

            // Maker (limit order) fee estimate
            const makerDetails = drift.calculateTradeDetails(
                marketIndex, leveragedAmount, selectedDirection,
                leverage, "limit" as OrderVariant,
                parseFloat(limitPrice) || undefined,
                walletBalanceUsd,
            );
            // Taker (market order) fee estimate
            const takerDetails = drift.calculateTradeDetails(
                marketIndex, leveragedAmount, selectedDirection,
                leverage, "market" as OrderVariant,
                undefined,
                walletBalanceUsd,
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
        }
    }, [activeProtocol, isDriftReady, isGmxsolReady, drift.calculateTradeDetails, drift.walletBalance, gmsol.calculateTradeDetails, marketIndex, tradeAmount, leverage, orderType, limitPrice, currentPrice, solPrice, baseSymbol, selectedDirection]);

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

    /** Drift-specific trade execution */
    const handleDriftTrade = useCallback(async (direction: TradeDirection, baseAmount: number) => {
        // Leveraged amount calculates position size
        let leveragedAmount = baseAmount * leverage;

        // Drift accepts floating point numbers but JS math can produce scientific notation (e.g. 2e-8) 
        // which breaks `convertToPerpPrecision` under the hood if it is too small. 
        // We round to a safe 6 decimals to represent viable step sizes on Solana.
        leveragedAmount = Number(leveragedAmount.toFixed(6));

        // Prevent placing trivially tiny orders that compile to nanocent precision
        if (leveragedAmount <= 0.0001) {
            toast.error("Trade size is too small for a valid position step size.");
            return;
        }

        const affordCheck = drift.canAffordTrade(leveragedAmount, marketIndex);
        if (!affordCheck.canAfford) {
            toast.error(affordCheck.reason ?? "Insufficient collateral for this trade.");
            return;
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

        // console.log("-----------------------------------------");
        // console.log(`[Drift] Placing ${orderType} order...`);
        // console.log("[Drift] Params:", params);

        const result = await drift.placeOrder(params);

        // console.log("[Drift] Order Result:", result);
        // console.log("-----------------------------------------");

        const explorerUrl = result?.explorerUrl ?? null;
        setLastTxUrl(explorerUrl);
        toast.success("Order placed on Drift!", {
            description: explorerUrl ? "View transaction on Solscan" : undefined,
            action: explorerUrl ? {
                label: "Open",
                onClick: () => window.open(explorerUrl, "_blank"),
            } : undefined,
            duration: 8000,
        });
    }, [leverage, drift, marketIndex, orderType, limitPrice, reduceOnly, postOnly]);

    /** GMXSol-specific trade execution */
    const handleGmxsolTrade = useCallback(async (direction: TradeDirection, baseAmount: number) => {
        if (!gmsol.markets.length) {
            toast.error("GMSOL markets not loaded yet. Please wait...");
            return;
        }

        // Find the best matching market
        const market = (marketIndex !== undefined && marketIndex >= 0 && marketIndex < gmsol.markets.length)
            ? gmsol.markets[marketIndex]
            : gmsol.markets.find(m => {
                const name = (m.name || "").split("/")[0].trim().toUpperCase();
                return name === baseSymbol.toUpperCase();
            }) || gmsol.markets[0];

        if (!market) {
            toast.error("No GMSOL market available.");
            return;
        }

        const isLong = direction === "long";
        const collateralToken = isLong ? market.longToken : market.shortToken;

        if (!currentPrice || currentPrice <= 0) {
            toast.error("Invalid market price.");
            return;
        }

        // Decimal-safe scaling: convert floats to integer strings, multiply as BigInt
        const scaleAndMultiply = (a: number, b: number, c: number, decimals: number): string => {
            if (isNaN(a) || isNaN(b) || isNaN(c)) return "0";

            const precision = 1e9;
            const aBig = BigInt(Math.round(a * precision));
            const bBig = BigInt(Math.round(b));
            const cBig = BigInt(Math.round(c * precision));

            // aBig * bBig * cBig = value * precision^2, then scale to target decimals
            const raw = (aBig * bBig * cBig * BigInt(Math.pow(10, decimals)))
                / (BigInt(precision) * BigInt(precision));
            return raw.toString();
        };

        const safeBaseAmount = Number(baseAmount.toFixed(6));
        if (safeBaseAmount <= 0.0001) {
            toast.error("Trade size is too small for a valid position on GMSOL.");
            return;
        }

        const sizeDeltaUsd = scaleAndMultiply(safeBaseAmount, leverage, currentPrice, 30);
        const rawAmount = BigInt(Math.round(safeBaseAmount * 1e9)).toString();

        const orderKind = orderType === "limit" ? "LimitIncrease" : "MarketIncrease";
        const triggerPrice = orderType === "limit" && limitPrice
            ? scaleDecimalToBigInt(limitPrice, 30)
            : "";

        const orderPayload = {
            marketToken: market.marketTokenMint,
            collateralToken,
            longToken: market.longToken,
            shortToken: market.shortToken,
            isLong,
            orderKind: orderKind as any,
            sizeDeltaUsd,
            amount: rawAmount,
            triggerPrice,
            takeProfitPrice: takeProfitPrice ? scaleDecimalToBigInt(takeProfitPrice, 30) : "",
            stopLossPrice: stopLossPrice ? scaleDecimalToBigInt(stopLossPrice, 30) : "",
        };

        console.log("-----------------------------------------");
        console.log(`[GMXSol] Placing ${orderType} order...`);
        console.log(`[GMXSol] Trade Input => Base Amount: ${baseAmount}, Safe Base Amount: ${safeBaseAmount}, Leverage: ${leverage}`);
        console.log(`[GMXSol] Calculated sizeDeltaUsd (scaled 30): ${sizeDeltaUsd}`);
        console.log(`[GMXSol] Calculated rawAmount (scaled 9): ${rawAmount}`);
        console.log("[GMXSol] Payload:", orderPayload);

        const sig = await gmsol.submitOrder(orderPayload);

        console.log("[GMXSol] Order Result Tx:", sig);
        console.log("-----------------------------------------");

        const cluster = process.env.NEXT_PUBLIC_GMSOL_NETWORK || "devnet";
        const explorerUrl = sig ? `https://solscan.io/tx/${sig}?cluster=${cluster}` : null;
        setLastTxUrl(explorerUrl);
        toast.success("Order placed on GMXSol!", {
            description: explorerUrl ? "View transaction on Solscan" : undefined,
            action: explorerUrl ? {
                label: "Open",
                onClick: () => window.open(explorerUrl, "_blank"),
            } : undefined,
            duration: 8000,
        });
    }, [gmsol, leverage, currentPrice, orderType, limitPrice, marketIndex, baseSymbol]);

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

        if (orderType === "limit") {
            const price = parseFloat(limitPrice);
            if (isNaN(price) || price <= 0) {
                toast.error("Please enter a valid limit price.");
                return;
            }
        }

        setIsTrading(true);
        setLastTxUrl(null);

        try {
            if (activeProtocol === "GMXSol") {
                // ── GMXSol trade path ──
                await handleGmxsolTrade(direction, baseAmount);
            } else {
                // ── Drift trade path ──
                await handleDriftTrade(direction, baseAmount);
            }
        } catch (err) {
            if (isUserCancellation(err)) {
                toast.info("Transaction cancelled.");
            } else {
                const message = err instanceof Error ? err.message : String(err);
                toast.error(`Trade failed: ${message}`);
            }
        } finally {
            setIsTrading(false);
        }
    }, [isProtocolReady, tradeAmount, selectedToken, currentPrice, activeProtocol, orderType, limitPrice, handleDriftTrade, handleGmxsolTrade]);

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
                <div className="flex flex-row items-center justify-between px-1">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Market Price</span>
                        <div className="text-lg font-medium text-foreground font-ibm">{formatPrice(currentPrice)}</div>
                    </div>
                    {/* AVAILABLE MARGIN */}
                    <div className="space-y-1 text-end">
                        <span className="text-xs text-muted-foreground">
                            Avail Margin
                        </span>
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg" alt="" width={20} height={20} className="rounded-full" />
                                SOL</SelectItem>
                            <SelectItem value="USDC">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/usdc.svg" alt="" width={20} height={20} className="rounded-full" />
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
                                    value={takeProfitPrice && currentPrice ?
                                        ((parseFloat(takeProfitPrice) - currentPrice) * (parseFloat(tradeAmount) * leverage || 0)).toFixed(2) : ""}
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
                                    value={stopLossPrice && currentPrice ?
                                        ((currentPrice - parseFloat(stopLossPrice)) * (parseFloat(tradeAmount) * leverage || 0)).toFixed(2) : ""}
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
                        {tradeEstimate && tradeEstimate.entryPrice > 0
                            ? (() => {
                                const amount = parseFloat(tradeAmount) || 0;
                                let size: number;
                                if (selectedToken === "USDC") {
                                    size = (amount / (tradeEstimate.entryPrice > 0 ? tradeEstimate.entryPrice : currentPrice)) * leverage;
                                } else {
                                    size = amount * leverage;
                                }
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
                    onMouseEnter={() => setSelectedDirection("long")}
                    onClick={() => handleTrade("long")}
                    disabled={!isProtocolReady || isTrading}
                    className="h-10 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-none"
                    variant="outline"
                >
                    {isTrading ? "Placing..." : "Long"}
                </Button>
                <Button
                    onMouseEnter={() => setSelectedDirection("short")}
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