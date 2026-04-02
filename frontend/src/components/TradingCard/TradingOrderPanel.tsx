"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import ProtocolDropDown from "./ProtocolDropDown";
import { OrderTypeSelector } from "./panel/OrderTypeSelector";
import { OrderOptionsSelector } from "./panel/OrderOptionsSelector";
import { OrderSizeInput } from "./panel/OrderSizeInput";
import { PreTradeStats } from "./panel/PreTradeStats";
import { LeverageSlider } from "./panel/LeverageSlider";
import { useProtocol } from "@/features/protocol-adapter/ProtocolContext";
import { useDriftContext } from "@/features/drift/DriftContext";
import { useGmxsolContext } from "@/features/gmxsol/GmxsolContext";
import type { ExecuteTradeParams, TradeDirection, OrderVariant } from "@/features/drift/types";
import type { ProtocolName } from "@/features/protocol-adapter/types";
import type { CreateOrderKind } from "@gmsol-labs/gmsol-sdk";
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
    const { prices } = usePriceFeed([baseSymbol, "SOL"]);

    // Protocol integration
    const { activeProtocol, setProtocol } = useProtocol();
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
        if (!activeProtocol && drift.isInitialized && drift.userAccountExists !== null) {
            setProtocol("drift");
        }
    }, [activeProtocol, drift.isInitialized, drift.userAccountExists, setProtocol]);

    useEffect(() => {
        if (orderType !== "limit" && limitPrice) {
            setLimitPrice("");
        }
    }, [orderType, limitPrice]);

    useEffect(() => {
        if (!tpslEnabled && (takeProfitPrice || stopLossPrice)) {
            setTakeProfitPrice("");
            setStopLossPrice("");
        }
    }, [tpslEnabled, takeProfitPrice, stopLossPrice]);

    // Drift is usable for data/trading when initialized (regardless of activeProtocol)
    // This lets us show estimates even when "All" is selected
    const isDriftReady = drift.isInitialized && drift.userAccountExists !== null;
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
        // For Drift, combine existing account collateral with wallet SOL that can
        // be auto-deposited during order placement.
        const driftAccountCollateral = drift.getFreeCollateral() ?? 0;
        return driftAccountCollateral + drift.walletBalance * solPrice;
    }, [activeProtocol, drift, gmsol, solPrice]);

    const convertDriftInputToBaseAmount = useCallback((amount: number): number => {
        if (amount <= 0 || currentPrice <= 0) return 0;

        if (selectedToken === "USDC") {
            return amount / currentPrice;
        }

        if (solPrice <= 0) return 0;
        return (amount * solPrice) / currentPrice;
    }, [currentPrice, selectedToken, solPrice]);

    const tradeEstimate = useMemo(() => {
        const amount = parseFloat(tradeAmount) || 0;
        if (amount <= 0) return null;

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
                currentPrice,
            );
            return {
                makerFee: null,
                takerFee: activeDetails?.estimatedFee ?? null,
                makerFeeRate: null,
                takerFeeRate: activeDetails?.feeRate ?? null,
                liquidationPrice: activeDetails?.liquidationPrice ?? null,
                requiredMargin: activeDetails?.requiredMargin ?? 0,
                positionValue: activeDetails?.positionValue ?? 0,
                entryPrice: activeDetails?.entryPrice ?? null,
                freeCollateral: activeDetails?.freeCollateral ?? 0,
                canAfford: activeDetails?.canAfford ?? false,
                priceImpact: activeDetails?.priceImpact ?? null,
            };
        } else {
            if (!isDriftReady) return null;
            const baseInMarketUnits = convertDriftInputToBaseAmount(amount);
            if (baseInMarketUnits <= 0) return null;
            const leveragedAmount = baseInMarketUnits * leverage;

            // Calculate wallet balance in USD for canAfford check
            const walletBalanceUsd =
                (drift.getFreeCollateral() ?? 0) + drift.walletBalance * solPrice;

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
                entryPrice: activeDetails?.entryPrice ?? null,
                freeCollateral: activeDetails?.freeCollateral ?? 0,
                canAfford: activeDetails?.canAfford ?? false,
                priceImpact: activeDetails?.priceImpact ?? null,
            };
        }
    }, [activeProtocol, isDriftReady, isGmxsolReady, drift, gmsol, marketIndex, tradeAmount, leverage, orderType, limitPrice, currentPrice, solPrice, baseSymbol, selectedDirection, convertDriftInputToBaseAmount]);

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

        if (!tradeEstimate) {
            toast.error("Trade estimate unavailable.");
            return;
        }

        if (!tradeEstimate.canAfford) {
            toast.error("Insufficient wallet collateral for this trade.");
            return;
        }

        await drift.ensureMarginForTrade({
            requiredMarginUsd: tradeEstimate.requiredMargin,
            collateralPriceUsd: solPrice,
            collateralSymbol: "SOL",
            subAccountId: 0,
            userAccountName: "Trading Account",
        });

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
        toast.success("Order placed on Drift!", {
            description: explorerUrl ? "View transaction on Solscan" : undefined,
            action: explorerUrl ? {
                label: "Open",
                onClick: () => window.open(explorerUrl, "_blank"),
            } : undefined,
            duration: 8000,
        });
    }, [leverage, drift, marketIndex, orderType, limitPrice, reduceOnly, postOnly, tradeEstimate, solPrice]);

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

        const isLimitOrder = orderType === "limit" && limitPrice.trim().length > 0;
        const orderKind: CreateOrderKind = isLimitOrder ? "LimitIncrease" : "MarketIncrease";
        const triggerPrice = isLimitOrder
            ? scaleDecimalToBigInt(limitPrice, 30)
            : "";
        const takeProfitTrigger = tpslEnabled && takeProfitPrice
            ? scaleDecimalToBigInt(takeProfitPrice, 30)
            : "";
        const stopLossTrigger = tpslEnabled && stopLossPrice
            ? scaleDecimalToBigInt(stopLossPrice, 30)
            : "";

        const orderPayload = {
            marketToken: market.marketTokenMint,
            collateralToken,
            longToken: market.longToken,
            shortToken: market.shortToken,
            isLong,
            orderKind,
            sizeDeltaUsd,
            amount: rawAmount,
            triggerPrice,
            takeProfitPrice: takeProfitTrigger,
            stopLossPrice: stopLossTrigger,
        };

        console.log("-----------------------------------------");
        console.log(`[GMXSol] Placing ${orderKind} order...`);
        console.log(`[GMXSol] Trade Input => Base Amount: ${baseAmount}, Safe Base Amount: ${safeBaseAmount}, Leverage: ${leverage}`);
        console.log(`[GMXSol] Calculated sizeDeltaUsd (scaled 30): ${sizeDeltaUsd}`);
        console.log(`[GMXSol] Calculated rawAmount (scaled 9): ${rawAmount}`);
        console.log("[GMXSol] Payload:", orderPayload);

        const sig = await gmsol.submitOrder(orderPayload);

        console.log("[GMXSol] Order Result Tx:", sig);
        console.log("-----------------------------------------");

        const cluster = process.env.NEXT_PUBLIC_GMSOL_NETWORK || "devnet";
        const explorerUrl = sig ? `https://solscan.io/tx/${sig}?cluster=${cluster}` : null;
        toast.success("Order placed on GMXSol!", {
            description: explorerUrl ? "View transaction on Solscan" : undefined,
            action: explorerUrl ? {
                label: "Open",
                onClick: () => window.open(explorerUrl, "_blank"),
            } : undefined,
            duration: 8000,
        });
    }, [gmsol, leverage, currentPrice, orderType, limitPrice, marketIndex, baseSymbol, takeProfitPrice, stopLossPrice, tpslEnabled]);

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

        let baseAmount = amount;
        if (activeProtocol === "drift") {
            baseAmount = convertDriftInputToBaseAmount(amount);
            if (baseAmount <= 0) {
                toast.error(`Cannot convert ${selectedToken} amount into ${baseSymbol} size right now.`);
                return;
            }
        } else if (selectedToken === "USDC") {
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
    }, [isProtocolReady, tradeAmount, selectedToken, currentPrice, activeProtocol, orderType, limitPrice, handleDriftTrade, handleGmxsolTrade, convertDriftInputToBaseAmount, baseSymbol]);

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
            <OrderTypeSelector
                orderType={orderType}
                setOrderType={setOrderType}
                currentPrice={currentPrice}
                limitPrice={limitPrice}
                setLimitPrice={setLimitPrice}
                freeCollateral={freeCollateral}
                activeProtocol={activeProtocol}
                isProtocolReady={isProtocolReady}
                isGmxsolReady={isGmxsolReady}
                formatPrice={formatPrice}
            />

            <Separator />

            {/* SIZE with TOKEN SELECTION */}
            <OrderSizeInput
                tradeAmount={tradeAmount}
                setTradeAmount={setTradeAmount}
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
            />

            <Separator />

            {/* LEVERAGE */}
            <LeverageSlider leverage={leverage} setLeverage={setLeverage} />

            <Separator />

            {/* ORDER OPTIONS */}
            <OrderOptionsSelector
                orderType={orderType}
                reduceOnly={reduceOnly}
                setReduceOnly={setReduceOnly}
                postOnly={postOnly}
                setPostOnly={setPostOnly}
                tpslEnabled={tpslEnabled}
                setTpslEnabled={setTpslEnabled}
                takeProfitPrice={takeProfitPrice}
                setTakeProfitPrice={setTakeProfitPrice}
                stopLossPrice={stopLossPrice}
                setStopLossPrice={setStopLossPrice}
                currentPrice={currentPrice}
                tradeAmount={tradeAmount}
                leverage={leverage}
            />

            <Separator />

            {/* PRE-TRADE STATS */}
            <PreTradeStats
                tradeEstimate={tradeEstimate}
                baseSymbol={baseSymbol}
                orderType={orderType}
                formatPrice={formatPrice}
                currentPrice={currentPrice}
            />

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
