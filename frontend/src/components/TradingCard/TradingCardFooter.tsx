"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useDriftContext } from "@/features/drift/DriftContext";
import { useGmxsolContext } from "@/features/gmxsol/GmxsolContext";
import { useProtocol } from "@/features/protocol-adapter/ProtocolContext";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { getAccountSummary } from "@/features/drift/adapter/positions";
import type { Position } from "@/features/protocol-adapter/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GMSOL_NETWORK } from "@/features/gmxsol/constants";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

/** Detect wallet-rejected / user-cancelled errors. */
function isUserCancellation(err: unknown): boolean {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return (
        msg.includes("user rejected") ||
        msg.includes("user denied") ||
        msg.includes("cancelled") ||
        msg.includes("canceled") ||
        msg.includes("rejected the request") ||
        msg.includes("user refused") ||
        msg.includes("transaction was not confirmed")
    );
}


const formatUsd = (value: number): string => {
    if (Math.abs(value) < 0.01) return "$0.00";
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const gmsolExplorerUrl = (signature?: string | null): string | null =>
    signature ? `https://solscan.io/tx/${signature}?cluster=${GMSOL_NETWORK}` : null;

const TradingCardFooter = () => {
    const { activeProtocol } = useProtocol();
    const drift = useDriftContext();
    const gmsol = useGmxsolContext();

    // Per-order cancel loading state
    const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
    const [closingPosition, setClosingPosition] = useState<string | null>(null);

    const handleCancelOrder = useCallback(async (orderAddress: string) => {
        setCancellingOrder(orderAddress);
        try {
            const sigs = await gmsol.submitCloseOrder(orderAddress);
            const explorerUrl = gmsolExplorerUrl(sigs?.[0]);
            toast.success("Order cancelled.", {
                description: explorerUrl ? "View transaction on Solscan" : undefined,
                action: explorerUrl ? {
                    label: "Open",
                    onClick: () => window.open(explorerUrl, "_blank"),
                } : undefined,
            });
        } catch (err) {
            if (isUserCancellation(err)) {
                toast.info("Cancel aborted.");
            } else {
                toast.error(err instanceof Error ? err.message : "Failed to cancel order");
            }
        } finally {
            setCancellingOrder(null);
        }
    }, [gmsol]);

    const handleClosePosition = useCallback(async (pos: PositionWithMeta) => {
        const id = `${pos.protocol}-${pos.marketIndex}`;
        setClosingPosition(id);
        try {
            if (pos.protocol === "drift") {
                const result = await drift.closePosition(pos.marketIndex);
                const explorerUrl = result?.explorerUrl ?? null;
                toast.success("Position closed on Drift.", {
                    description: explorerUrl ? "View transaction on Solscan" : undefined,
                    action: explorerUrl ? {
                        label: "Open",
                        onClick: () => window.open(explorerUrl, "_blank"),
                    } : undefined,
                });
            } else if (pos.protocol === "GMXSol") {
                if (!pos.marketToken) {
                    throw new Error("Missing market token for GMXSol position");
                }
                const positionInfo = gmsol.positions.find(
                    (p) => p.marketToken === pos.marketToken && p.side === pos.side
                );
                if (!positionInfo) {
                    throw new Error("Position not found in GMXSol positions");
                }
                const sigs = await gmsol.submitClosePosition(positionInfo);
                const explorerUrl = gmsolExplorerUrl(sigs?.[0]);
                toast.success("Position close transaction sent.", {
                    description: explorerUrl ? "View transaction on Solscan" : undefined,
                    action: explorerUrl ? {
                        label: "Open",
                        onClick: () => window.open(explorerUrl, "_blank"),
                    } : undefined,
                });
            }
        } catch (err) {
            if (isUserCancellation(err)) {
                toast.info("Close action aborted.");
            } else {
                toast.error(err instanceof Error ? err.message : "Failed to close position");
            }
        } finally {
            setClosingPosition(null);
        }
    }, [drift, gmsol]);

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
        // Always include SOL for wallet balance USD conversion
        symbols.add("SOL");
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

    // ── GMSOL: SDK constants ────────────────────────────────────────
    // sizeInUsd in Position accounts uses 30 decimals.
    const SIZE_USD_DIVISOR_30_TO_HUMAN = BigInt("1000000000000000000000000000000"); // 10^30

    // ── GMSOL data (SDK-computed) ───────────────────────────────────
    const [gmsolPositions, setGmsolPositions] = useState<(Position & { protocol: string })[]>([]);

    // Use the SDK enrichment pipeline for accurate position data
    useEffect(() => {
        if (gmsol.positions.length === 0) {
            setGmsolPositions([]);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const { enrichAllPositions } = await import("@/features/gmxsol/adapter/enrich-positions");
                const enriched = await enrichAllPositions(
                    gmsol.positions,
                    gmsol.markets,
                    pythPrices,
                );

                if (cancelled) return;

                const mapped = enriched
                    .filter((e) => e.sizeUsd >= 0.01)
                    .map((e, idx) => {
                        const market = gmsol.markets.find(
                            (m) => m.marketTokenMint === e.raw.marketToken,
                        );
                        const rawName = market?.name || e.raw.marketToken.slice(0, 8);
                        const cleanName = rawName.replace(/\[.*\]$/, "").trim();
                        const baseSymbol = market?.name?.split("/")[0]?.trim() || "";
                        const currentPrice = baseSymbol ? (pythPrices[baseSymbol] ?? 0) : 0;

                        return {
                            marketIndex: idx,
                            marketSymbol: cleanName,
                            size: e.sizeUsd,
                            entryPrice: e.entryPrice,
                            currentPrice,
                            unrealizedPnl: e.unrealizedPnl,
                            leverage: e.leverage,
                            liquidationPrice: e.liquidationPrice,
                            protocol: "GMXSol" as const,
                            side: e.raw.side,
                            marketToken: e.raw.marketToken,
                        };
                    });

                setGmsolPositions(mapped);
            } catch (err) {
                console.error("[TradingCardFooter] SDK enrichment failed:", err);
                // Fallback: basic computation without SDK
                if (cancelled) return;
                setGmsolPositions(
                    gmsol.positions
                        .map((pos, idx) => {
                            const market = gmsol.markets.find(
                                (m) => m.marketTokenMint === pos.marketToken,
                            );
                            const rawName = market?.name || pos.marketToken.slice(0, 8);
                            const cleanName = rawName.replace(/\[.*\]$/, "").trim();
                            const sizeRaw = BigInt(pos.sizeInUsd || "0");
                            const sizeUsd = Number(sizeRaw * BigInt(1000000) / SIZE_USD_DIVISOR_30_TO_HUMAN) / 1e6;

                            return {
                                marketIndex: idx,
                                marketSymbol: cleanName,
                                size: sizeUsd,
                                entryPrice: 0,
                                currentPrice: 0,
                                unrealizedPnl: 0,
                                leverage: 0,
                                liquidationPrice: undefined as number | undefined,
                                protocol: "GMXSol" as const,
                                side: pos.side,
                                marketToken: pos.marketToken,
                            };
                        })
                        .filter((p) => p.size >= 0.01),
                );
            }
        })();

        return () => { cancelled = true; };
    }, [gmsol.positions, gmsol.markets, pythPrices, SIZE_USD_DIVISOR_30_TO_HUMAN]);

    // ── Merged views ───────────────────────────────────────────────
    type PositionWithMeta = Position & { protocol: string; side: string; marketToken?: string };

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
        if (activeProtocol === "drift") return [];
        return gmsol.orders.map((o) => {
            // Find matching market for a human-readable name
            const market = gmsol.markets.find(m => m.marketTokenMint === o.marketToken);
            const marketName = market?.name?.replace(/\[.*\]$/, "").trim() || o.marketToken.slice(0, 8);

            // Convert sizeDelta from 30-decimal to human USD
            let sizeDeltaUsd = 0;
            try {
                sizeDeltaUsd = Number(BigInt(o.sizeDeltaValue) * BigInt(1000000) / SIZE_USD_DIVISOR_30_TO_HUMAN) / 1e6;
            } catch { /* ignore */ }

            return {
                address: o.address,
                kind: o.kind,
                side: o.side,
                market: marketName,
                sizeDelta: o.sizeDeltaValue,
                sizeDeltaUsd,
                state: o.actionState,
                protocol: "GMXSol",
            };
        });
    }, [activeProtocol, gmsol.orders, gmsol.markets, SIZE_USD_DIVISOR_30_TO_HUMAN]);

    useEffect(() => {
        if (isDriftReady && activeProtocol === "drift" && drift.driftClient && drift.user) {
            const openOrders = getAccountSummary(drift.driftClient, drift.user)?.openOrders || [];
            if (openOrders.length > 0) {
                // console.log("-----------------------------------------");
                // console.log("Drift Open (Unfilled) Orders:", openOrders);
                // console.log("-----------------------------------------");
            }
        }
    }, [isDriftReady, activeProtocol, drift.driftClient, drift.user]);

    const driftPnl = useMemo(() => {
        return allPositions
            .filter((p) => p.protocol === "drift")
            .reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    }, [allPositions]);

    return (
        <div className="w-full border overflow-hidden">
            <Tabs defaultValue="positions" className="w-full">
                {/* TAB HEADERS */}
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-1">
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
                                        <th className="p-2 text-right font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPositions.map((pos, i) => (
                                        <tr key={`${pos.protocol}-${pos.marketIndex}-${i}`} className="border-b border-border/50 hover:bg-accent/30 font-ibm">
                                            <td className="p-2 font-medium">{pos.marketSymbol}</td>
                                            <td className="p-1">
                                                <Badge
                                                    variant="outline"
                                                    className={`rounded-none ${pos.side === "long"
                                                        ? "text-emerald-500 border-emerald-500/30"
                                                        : "text-red-500 border-red-500/30"
                                                        }`}
                                                >
                                                    {pos.side === "long" ? "Long" : "Short"}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-right font-mono">{pos.size}</td>
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
                                                <Badge variant="outline" className="text-[12px] rounded-none">
                                                    {pos.protocol === "drift" ? "Drift" : "GMXSol"}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-xs text-red-500 hover:text-red-400"
                                                    onClick={() => handleClosePosition(pos as PositionWithMeta)}
                                                    disabled={closingPosition === `${pos.protocol}-${pos.marketIndex}`}
                                                >
                                                    {closingPosition === `${pos.protocol}-${pos.marketIndex}` ? "Closing..." : "Close"}
                                                </Button>
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
                            <table className="w-full text-sm">
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
                        {/* Wallet Balance (SOL) - Common for both protocols */}
                        <div className="space-y-2 pb-4 border-b border-border/50">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wallet Balance</div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">SOL Balance:</span>
                                <span className="text-foreground font-medium font-mono">
                                    {drift.walletBalance.toFixed(4)} SOL
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">USD Value:</span>
                                <span className="text-foreground font-medium font-mono">
                                    {formatUsd(drift.walletBalance * (pythPrices["SOL"] || 0))}
                                </span>
                            </div>
                        </div>

                        {/* Drift balances */}
                        {(activeProtocol === "drift" || !activeProtocol) && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drift Account</div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Deposited Collateral:</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {isDriftReady ? formatUsd(driftCollateral.total) : "-"} USDC
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Available (Free):</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {isDriftReady ? formatUsd(driftCollateral.free) : "-"} USDC
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
                                    <span className="text-muted-foreground">SOL Balance:</span>
                                    <span className="text-foreground font-medium font-mono">
                                        {gmsol.walletBalance.toFixed(4)} SOL
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
