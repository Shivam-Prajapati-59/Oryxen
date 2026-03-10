"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { useDriftContext } from "@/features/drift/DriftContext";
import { useGmxsolContext } from "@/features/gmxsol/GmxsolContext";
import { useProtocol } from "@/features/protocol-adapter/ProtocolContext";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import type { Position } from "@/features/protocol-adapter/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Index-token decimals keyed by normalised base symbol. */
const INDEX_TOKEN_DECIMALS: Record<string, number> = {
    sol: 9, btc: 8, eth: 18, wbtc: 8, weth: 18,
};
function indexDecimals(symbol: string): number {
    return INDEX_TOKEN_DECIMALS[symbol.toLowerCase()] ?? 9;
}

const formatUsd = (value: number): string => {
    if (Math.abs(value) < 0.01) return "$0.00";
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const TradingCardFooter = () => {
    const { activeProtocol } = useProtocol();
    const drift = useDriftContext();
    const gmsol = useGmxsolContext();

    // Per-order cancel loading state
    const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

    const handleCancelOrder = useCallback(async (orderAddress: string) => {
        setCancellingOrder(orderAddress);
        try {
            await gmsol.submitCloseOrder(orderAddress);
            toast.success("Order cancelled.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to cancel order");
        } finally {
            setCancellingOrder(null);
        }
    }, [gmsol]);

    // ── Drift data ─────────────────────────────────────────────────
    const isDriftReady = drift.isInitialized && drift.userAccountExists === true;

    const driftPositions: Position[] = useMemo(() => {
        if (!isDriftReady) return [];
        const positions = drift.getPositions();
        const totalCollateral = drift.getTotalCollateral() || 0;
        return positions.map((pos) => ({
            marketIndex: pos.marketIndex,
            marketSymbol: pos.marketName,
            size: pos.size,
            entryPrice: pos.entryPrice,
            currentPrice: pos.markPrice,
            unrealizedPnl: pos.unrealizedPnl,
            leverage: totalCollateral > 0 ? pos.notionalValue / totalCollateral : 0,
            liquidationPrice: pos.liquidationPrice,
            protocol: "drift" as const,
        }));
    }, [isDriftReady, drift]);

    const driftCollateral = useMemo(() => {
        if (!isDriftReady) return { free: 0, total: 0 };
        return {
            free: drift.getFreeCollateral() ?? 0,
            total: drift.getTotalCollateral() ?? 0,
        };
    }, [isDriftReady, drift]);

    // ── GMSOL: extract base symbols for Pyth price subscription ───
    const gmsolBaseSymbols = useMemo(() => {
        const symbols = new Set<string>();
        for (const pos of gmsol.positions) {
            const market = gmsol.markets.find(
                (m) => m.marketTokenMint === pos.marketToken,
            );
            if (market?.name) {
                // Market name is e.g. "SOL/USD" → extract "SOL"
                const base = market.name.split("/")[0]?.trim();
                if (base) symbols.add(base);
            }
        }
        return Array.from(symbols);
    }, [gmsol.positions, gmsol.markets]);

    const { prices: pythPrices } = usePriceFeed(gmsolBaseSymbols);

    // ── GMSOL data ─────────────────────────────────────────────────
    const gmsolPositions: (Position & { protocol: string })[] = useMemo(() => {
        return gmsol.positions.map((pos, idx) => {
            const sizeRaw = BigInt(pos.sizeInUsd || "0");
            const sizeUsd = Number(sizeRaw) / 1e30;
            // Collateral is stored in token-native decimals (9 for SOL, 6 for USDC)
            // Default to 9 (SOL) since most GMSOL positions use SOL-denominated collateral
            const collateralRaw = BigInt(pos.collateralAmount || "0");
            const collateralUsd = Number(collateralRaw) / 1e9;
            const market = gmsol.markets.find(
                (m) => m.marketTokenMint === pos.marketToken,
            );
            const baseSymbol = market?.name?.split("/")[0]?.trim() || "";
            const tokDecimals = indexDecimals(baseSymbol);

            // Entry price = sizeInUsd / sizeInTokens (both u128)
            // sizeInUsd has 30 decimals, sizeInTokens has tokDecimals decimals
            const sizeInTokensRaw = BigInt(pos.sizeInTokens || "0");
            let entryPrice = 0;
            if (sizeInTokensRaw > BigInt(0)) {
                // entryPrice = (sizeInUsd / 1e30) / (sizeInTokens / 10^tokDecimals)
                //            = sizeInUsd * 10^tokDecimals / (sizeInTokens * 10^30)
                // We scale to 18 intermediate decimals to preserve precision
                const PRECISION = BigInt(18);
                const scaledNumerator = sizeRaw * BigInt(10) ** (PRECISION + BigInt(tokDecimals));
                const scaledDenominator = sizeInTokensRaw * BigInt(10) ** BigInt(30);
                entryPrice = Number(scaledNumerator / scaledDenominator) / Number(BigInt(10) ** PRECISION);
            }

            // Current price from Pyth websocket
            const currentPrice = baseSymbol ? (pythPrices[baseSymbol] ?? 0) : 0;

            // PnL = tokenAmount * (currentPrice - entryPrice) for longs
            //      = tokenAmount * (entryPrice - currentPrice) for shorts
            const tokenAmount = Number(sizeInTokensRaw) / Math.pow(10, tokDecimals);
            let unrealizedPnl = 0;
            if (currentPrice > 0 && entryPrice > 0) {
                unrealizedPnl = pos.side === "long"
                    ? tokenAmount * (currentPrice - entryPrice)
                    : tokenAmount * (entryPrice - currentPrice);
            }

            return {
                marketIndex: idx,
                marketSymbol: market?.name || pos.marketToken.slice(0, 8),
                size: sizeUsd,
                entryPrice,
                currentPrice,
                unrealizedPnl,
                leverage: collateralUsd > 0 ? sizeUsd / collateralUsd : 0,
                protocol: "GMXSol" as const,
                side: pos.side,
            };
        });
    }, [gmsol.positions, gmsol.markets, pythPrices]);

    // ── Merged views ───────────────────────────────────────────────
    type PositionWithMeta = Position & { protocol: string; side: string };

    const allPositions = useMemo((): PositionWithMeta[] => {
        const driftWithProtocol: PositionWithMeta[] = driftPositions.map((p) => ({
            ...p,
            protocol: "drift" as const,
            side: p.size > 0 ? "long" : "short",
        }));
        if (activeProtocol === "drift") return driftWithProtocol;
        if (activeProtocol === "GMXSol") return gmsolPositions as PositionWithMeta[];
        return [...driftWithProtocol, ...(gmsolPositions as PositionWithMeta[])];
    }, [activeProtocol, driftPositions, gmsolPositions]);

    const allOrders = useMemo(() => {
        if (!gmsol.orders.length) return [];
        // Show GMSOL orders; Drift orders are managed by Drift's own system
        if (activeProtocol === "drift") return [];
        return gmsol.orders.map((o) => ({
            address: o.address,
            kind: o.kind,
            side: o.side,
            market: o.marketToken.slice(0, 8),
            sizeDelta: o.sizeDeltaValue,
            state: o.actionState,
            protocol: "GMXSol",
        }));
    }, [activeProtocol, gmsol.orders]);

    const totalPnl = useMemo(() => {
        return allPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    }, [allPositions]);

    const driftPnl = useMemo(() => {
        return allPositions
            .filter((p) => p.protocol === "drift")
            .reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    }, [allPositions]);

    return (
        <div className="w-full border overflow-hidden">
            <Tabs defaultValue="positions" className="w-full">
                {/* TAB HEADERS */}
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                    <TabsTrigger
                        value="positions"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        Positions ({allPositions.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="orders"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        Orders ({allOrders.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="balance"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        Balance
                    </TabsTrigger>
                    <TabsTrigger
                        value="tradeHistory"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        History
                    </TabsTrigger>
                </TabsList>

                {/* ─── POSITIONS ────────────────────────────────────── */}
                <TabsContent value="positions" className="mt-0">
                    {allPositions.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            No open positions.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-2 text-left font-medium">Market</th>
                                        <th className="p-2 text-left font-medium">Side</th>
                                        <th className="p-2 text-right font-medium">Size</th>
                                        <th className="p-2 text-right font-medium">Entry</th>
                                        <th className="p-2 text-right font-medium">Mark</th>
                                        <th className="p-2 text-right font-medium">PnL</th>
                                        <th className="p-2 text-right font-medium">Lev</th>
                                        <th className="p-2 text-right font-medium">Liq.</th>
                                        <th className="p-2 text-left font-medium">Proto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPositions.map((pos, i) => (
                                        <tr key={`${pos.protocol}-${pos.marketIndex}-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                                            <td className="p-2 font-medium">{pos.marketSymbol}</td>
                                            <td className="p-2">
                                                <Badge variant="outline" className={
                                                    pos.side === "long"
                                                        ? "text-emerald-500 border-emerald-500/30"
                                                        : "text-red-500 border-red-500/30"
                                                }>
                                                    {pos.side === "long" ? "Long" : "Short"}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-right font-mono">{formatUsd(pos.size)}</td>
                                            <td className="p-2 text-right font-mono">{pos.entryPrice ? formatUsd(pos.entryPrice) : "-"}</td>
                                            <td className="p-2 text-right font-mono">{pos.currentPrice ? formatUsd(pos.currentPrice) : "-"}</td>
                                            <td className={`p-2 text-right font-mono ${pos.unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                {formatUsd(pos.unrealizedPnl)}
                                            </td>
                                            <td className="p-2 text-right font-mono">{pos.leverage != null ? `${pos.leverage.toFixed(1)}x` : "-"}</td>
                                            <td className="p-2 text-right font-mono text-red-400">
                                                {pos.liquidationPrice ? formatUsd(pos.liquidationPrice) : "-"}
                                            </td>
                                            <td className="p-2">
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {pos.protocol === "drift" ? "Drift" : "GMXSol"}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>

                {/* ─── ORDERS ───────────────────────────────────────── */}
                <TabsContent value="orders" className="mt-0">
                    {allOrders.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            No active orders.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="p-2 text-left font-medium">Market</th>
                                        <th className="p-2 text-left font-medium">Type</th>
                                        <th className="p-2 text-left font-medium">Side</th>
                                        <th className="p-2 text-right font-medium">Size</th>
                                        <th className="p-2 text-left font-medium">Status</th>
                                        <th className="p-2 text-left font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allOrders.map((order) => (
                                        <tr key={order.address} className="border-b border-border/50 hover:bg-accent/30">
                                            <td className="p-2 font-medium">{order.market}</td>
                                            <td className="p-2">{order.kind}</td>
                                            <td className="p-2">
                                                <Badge variant="outline" className={
                                                    order.side === "long"
                                                        ? "text-emerald-500 border-emerald-500/30"
                                                        : "text-red-500 border-red-500/30"
                                                }>
                                                    {order.side === "long" ? "Long" : "Short"}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-right font-mono">
                                                {formatUsd(Number(BigInt(order.sizeDelta || "0")) / 1e30)}
                                            </td>
                                            <td className="p-2">{order.state}</td>
                                            <td className="p-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-xs text-red-500 hover:text-red-400"
                                                    onClick={() => handleCancelOrder(order.address)}
                                                    disabled={cancellingOrder === order.address}
                                                >
                                                    {cancellingOrder === order.address ? "Cancelling..." : "Cancel"}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>

                {/* ─── BALANCE ──────────────────────────────────────── */}
                <TabsContent value="balance" className="mt-0">
                    <div className="p-6 space-y-4">
                        {/* Drift balances */}
                        {(activeProtocol === "drift" || !activeProtocol) && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drift</div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Available Balance:</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {isDriftReady ? formatUsd(driftCollateral.free) : "-"} USDC
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Equity:</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {isDriftReady ? formatUsd(driftCollateral.total) : "-"} USDC
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Unrealized PnL:</span>
                                    <span className={`font-medium font-mono ${driftPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {isDriftReady ? formatUsd(driftPnl) : "-"} USDC
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* GMXSol info */}
                        {(activeProtocol === "GMXSol" || !activeProtocol) && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">GMXSol</div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Wallet:</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {gmsol.privyWallet
                                            ? `${gmsol.privyWallet.address.slice(0, 4)}...${gmsol.privyWallet.address.slice(-4)}`
                                            : "Not connected"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Markets Loaded:</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {gmsol.markets.length}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Open Positions:</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {gmsol.positions.length}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ─── HISTORY ──────────────────────────────────────── */}
                <TabsContent value="tradeHistory" className="mt-0">
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        Trade history coming soon.
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TradingCardFooter;
