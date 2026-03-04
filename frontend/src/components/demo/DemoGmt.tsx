/**
 * DemoGmt — interactive demo component for GMTrade on Solana.
 *
 * Follows the same UI pattern as `DemoFlash.tsx`,
 * connecting users via Privy wallet to the GMTrade protocol.
 */

"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    BarChart3,
    Wallet,
    List,
} from "lucide-react";
import { useGmt } from "@/features/gmt";
import type { MarketInfo, PositionInfo, PositionSide } from "@/features/gmt";

// ─── UI constants ────────────────────────────────────────────────────

const LEVERAGE_OPTIONS = [2, 3, 5, 10, 20];

const DemoGmt = () => {
    const { authenticated, login, ready } = usePrivy();

    // ── Hook ─────────────────────────────────────────────────────────

    const {
        privyWallet,
        isLoading,
        error,
        isTrading,
        tradeError,
        lastTradeResult,
        network,
        listMarkets,
        listPositions,
        openPosition,
        closePosition,
        openLimitOrder,
        takeProfitOrder,
        stopLossOrder,
    } = useGmt();

    // ── Local state ──────────────────────────────────────────────────

    const [markets, setMarkets] = useState<MarketInfo[]>([]);
    const [positions, setPositions] = useState<PositionInfo[]>([]);
    const [selectedMarket, setSelectedMarket] = useState("");
    const [direction, setDirection] = useState<PositionSide>("long");
    const [collateral, setCollateral] = useState("0.5"); // SOL
    const [sizeUsd, setSizeUsd] = useState("1000");
    const [leverage, setLeverage] = useState(5);
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [triggerPrice, setTriggerPrice] = useState("");
    const [showPositions, setShowPositions] = useState(false);
    const [showMarkets, setShowMarkets] = useState(false);

    // ── Handlers ─────────────────────────────────────────────────────

    const handleListMarkets = async () => {
        const data = await listMarkets();
        setMarkets(data);
        setShowMarkets(true);
        if (data.length > 0 && !selectedMarket) {
            setSelectedMarket(data[0].name);
        }
    };

    const handleListPositions = async () => {
        const data = await listPositions();
        setPositions(data);
        setShowPositions(true);
    };

    const handleOpenPosition = async () => {
        const collateralLamports = Math.round(
            parseFloat(collateral) * 1_000_000_000,
        ); // SOL → lamports

        if (orderType === "limit" && triggerPrice) {
            await openLimitOrder({
                marketName: selectedMarket,
                collateralLamports,
                sizeUsdWhole: parseInt(sizeUsd),
                isLong: direction === "long",
                triggerPriceUsd: parseInt(triggerPrice),
            });
        } else {
            await openPosition({
                marketName: selectedMarket,
                collateralLamports,
                sizeUsdWhole: parseInt(sizeUsd),
                isLong: direction === "long",
            });
        }
    };

    // Calculate effective leverage
    const effectiveLeverage =
        parseFloat(sizeUsd) / (parseFloat(collateral) * 150); // rough estimate using SOL ~$150

    // ── Loading ──────────────────────────────────────────────────────

    if (!ready) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">
                    Loading Privy SDK...
                </span>
            </div>
        );
    }

    // ── Not Authenticated ────────────────────────────────────────────

    if (!authenticated) {
        return (
            <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-lg">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    GMTrade Demo
                </h2>
                <p className="text-muted-foreground">
                    Connect your Solana wallet to trade perpetual futures on GMTrade
                    (GMX-Solana).
                </p>
                <Button onClick={login} size="lg" className="w-full">
                    Connect Wallet
                </Button>
            </div>
        );
    }

    // ── Main UI ──────────────────────────────────────────────────────

    return (
        <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-lg">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                GMTrade Demo
                <span className="ml-auto text-xs font-normal text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                    {network}
                </span>
            </h2>

            {/* ── Wallet Info ─────────────────────────────────────────────── */}
            <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    Wallet
                </h3>
                {privyWallet ? (
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <code className="text-xs break-all">{privyWallet.address}</code>
                    </div>
                ) : (
                    <p className="text-sm text-destructive">
                        No Solana wallet found. Make sure you have a Solana wallet linked in
                        Privy.
                    </p>
                )}
            </div>

            {/* ── Markets & Positions ─────────────────────────────────────── */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleListMarkets}
                    disabled={isLoading}
                    className="flex-1"
                >
                    {isLoading ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                        <BarChart3 className="mr-1 h-3 w-3" />
                    )}
                    List Markets
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleListPositions}
                    disabled={isLoading || !privyWallet}
                    className="flex-1"
                >
                    {isLoading ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                        <List className="mr-1 h-3 w-3" />
                    )}
                    My Positions
                </Button>
            </div>

            {/* Markets list */}
            {showMarkets && markets.length > 0 && (
                <div className="rounded-lg border p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Available Markets ({markets.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {markets.map((m) => (
                            <button
                                key={m.address}
                                onClick={() => setSelectedMarket(m.name)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedMarket === m.name
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted hover:bg-muted/80"
                                    }`}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Positions list */}
            {showPositions && (
                <div className="rounded-lg border p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Open Positions
                    </h3>
                    {positions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            No open positions found.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {positions.map((p) => (
                                <div
                                    key={p.address}
                                    className="flex items-center justify-between rounded-md bg-muted p-2 text-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={
                                                p.side === "long" ? "text-green-600" : "text-red-600"
                                            }
                                        >
                                            {p.side.toUpperCase()}
                                        </span>
                                        <code className="text-muted-foreground">
                                            {p.address.slice(0, 8)}...
                                        </code>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            closePosition({
                                                marketName: selectedMarket,
                                                side: p.side,
                                                sizeUsdWhole: 0, // full close
                                            })
                                        }
                                        disabled={isTrading}
                                        className="h-6 text-xs"
                                    >
                                        Close
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Order Form ──────────────────────────────────────────────── */}
            <div className="rounded-lg border p-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Open Position
                </h3>

                {/* Order Type */}
                <div className="flex gap-2">
                    <Button
                        variant={orderType === "market" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setOrderType("market")}
                    >
                        Market
                    </Button>
                    <Button
                        variant={orderType === "limit" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setOrderType("limit")}
                    >
                        Limit
                    </Button>
                </div>

                {/* Direction */}
                <div className="flex gap-2">
                    <Button
                        variant={direction === "long" ? "default" : "outline"}
                        size="sm"
                        className={
                            direction === "long"
                                ? "flex-1 bg-green-600 hover:bg-green-700"
                                : "flex-1"
                        }
                        onClick={() => setDirection("long")}
                    >
                        <TrendingUp className="mr-1 h-4 w-4" />
                        Long
                    </Button>
                    <Button
                        variant={direction === "short" ? "default" : "outline"}
                        size="sm"
                        className={
                            direction === "short"
                                ? "flex-1 bg-red-600 hover:bg-red-700"
                                : "flex-1"
                        }
                        onClick={() => setDirection("short")}
                    >
                        <TrendingDown className="mr-1 h-4 w-4" />
                        Short
                    </Button>
                </div>

                {/* Market selector (text input or select from loaded markets) */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Market
                    </label>
                    <Input
                        type="text"
                        value={selectedMarket}
                        onChange={(e) => setSelectedMarket(e.target.value)}
                        placeholder='e.g. SOL/USD[WSOL-USDC]'
                    />
                </div>

                {/* Collateral */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Collateral (SOL)
                    </label>
                    <Input
                        type="text"
                        value={collateral}
                        onChange={(e) => setCollateral(e.target.value)}
                        placeholder="0.5"
                    />
                </div>

                {/* Size */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Position Size (USD)
                    </label>
                    <Input
                        type="text"
                        value={sizeUsd}
                        onChange={(e) => setSizeUsd(e.target.value)}
                        placeholder="1000"
                    />
                </div>

                {/* Trigger Price (limit only) */}
                {orderType === "limit" && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                            Trigger Price (USD)
                        </label>
                        <Input
                            type="text"
                            value={triggerPrice}
                            onChange={(e) => setTriggerPrice(e.target.value)}
                            placeholder="e.g. 150"
                        />
                    </div>
                )}

                {/* Trade Summary */}
                <div className="rounded-md bg-muted p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span>{orderType.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Direction</span>
                        <span
                            className={
                                direction === "long" ? "text-green-600" : "text-red-600"
                            }
                        >
                            {direction.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Market</span>
                        <span>{selectedMarket || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Collateral</span>
                        <span>{collateral} SOL</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Size</span>
                        <span>${sizeUsd}</span>
                    </div>
                    {orderType === "limit" && triggerPrice && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Trigger</span>
                            <span>${triggerPrice}</span>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <Button
                    onClick={handleOpenPosition}
                    disabled={
                        isTrading ||
                        !selectedMarket ||
                        !collateral ||
                        !sizeUsd ||
                        !privyWallet
                    }
                    className={`w-full ${direction === "long"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                >
                    {isTrading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            {direction === "long" ? (
                                <TrendingUp className="mr-2 h-4 w-4" />
                            ) : (
                                <TrendingDown className="mr-2 h-4 w-4" />
                            )}
                            {orderType === "limit" ? "Place Limit" : "Open"}{" "}
                            {direction.toUpperCase()} {selectedMarket.split("/")[0] || ""}
                        </>
                    )}
                </Button>

                {/* Error */}
                {(tradeError || error) && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {tradeError || error}
                    </div>
                )}

                {/* Success */}
                {lastTradeResult?.success && (
                    <div className="flex items-start gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p className="font-medium">Order submitted!</p>
                            {lastTradeResult.txSignature && (
                                <a
                                    href={`https://explorer.solana.com/tx/${lastTradeResult.txSignature}?cluster=${network}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs underline break-all"
                                >
                                    {lastTradeResult.txSignature}
                                </a>
                            )}
                            {lastTradeResult.orderAddress && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Order: {lastTradeResult.orderAddress.slice(0, 16)}…
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoGmt;
