"use client";

import React, { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

import { GROUPS } from "@/config/FundingRate";
import { usePerps } from "@/hooks/usePerps";
import { useAllFundingRates } from "@/hooks/useFundingRates";

const RatesCard = () => {
    const [timeFrame, setTimeFrame] = useState("current");
    const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);

    const { data: perps, isLoading: perpsLoading, isError: perpsError, error: perpsErrorMsg } = usePerps();
    const { drift, hyperliquid, isLoading: ratesLoading } = useAllFundingRates();

    const allProtocols = GROUPS.flatMap((g) => g.protocols);

    const toggleProtocol = (key: string) => {
        setSelectedProtocols((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const visibleGroups = useMemo(() => {
        return GROUPS.map((group) => ({
            ...group,
            protocols: group.protocols.filter(
                (p) => selectedProtocols.length === 0 || selectedProtocols.includes(p.key)
            ),
        })).filter((group) => group.protocols.length > 0);
    }, [selectedProtocols]);

    // Filter perps based on selected protocols
    const filteredPerps = useMemo(() => {
        if (!perps) return [];
        if (selectedProtocols.length === 0) return perps;

        return perps.filter((perp) => {
            const protocol = perp.protocol.toLowerCase();
            return selectedProtocols.some((key) => {
                if (key === "drift" && protocol.includes("drift")) return true;
                if (key === "hyperliquid" && protocol.includes("hyperliquid")) return true;
                return false;
            });
        });
    }, [perps, selectedProtocols]);

    // Create funding rate lookup map
    const fundingRatesMap = useMemo(() => {
        const map = new Map<string, { drift?: number; hyperliquid?: number }>();

        // Add Drift rates
        drift.data?.data.forEach((rate) => {
            const existing = map.get(rate.symbol) || {};
            map.set(rate.symbol, { ...existing, drift: rate.hourlyRate });
        });

        // Add Hyperliquid rates
        hyperliquid.data?.data.forEach((rate) => {
            const existing = map.get(rate.symbol) || {};
            map.set(rate.symbol, { ...existing, hyperliquid: rate.hourlyRate });
        });

        return map;
    }, [drift.data, hyperliquid.data]);

    // Get funding rate for a specific perp and protocol
    const getFundingRate = (perpName: string, protocolKey: string): string => {
        // Try exact match first
        let rates = fundingRatesMap.get(perpName);

        // If no exact match, try to find by base asset
        if (!rates) {
            // Extract base asset (e.g., "BTCUSDT" -> "BTC", "BTC-PERP" -> "BTC")
            const baseAsset = perpName.replace(/USDT?|PERP|-PERP|-USD/gi, '').trim();
            const perpSymbol = `${baseAsset}-PERP`;
            rates = fundingRatesMap.get(perpSymbol);
        }

        if (!rates) return "-";

        const rate = protocolKey === "drift" ? rates.drift : rates.hyperliquid;
        if (rate === undefined) return "-";

        // Format as percentage with appropriate precision
        const formatted = (rate * 100).toFixed(4);
        return `${formatted}%`;
    };

    const isLoading = perpsLoading || ratesLoading;
    const isError = perpsError;

    if (isLoading) {
        return (
            <Card className="h-full w-full p-2 border border-black/20 dark:border-white/10">
                <CardContent className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading markets and rates...</p>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card className="h-full w-full p-2 border border-black/20 dark:border-white/10">
                <CardContent className="py-12 text-center">
                    <p className="text-destructive">Error: {perpsErrorMsg?.message}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full w-full p-2 border border-black/20 dark:border-white/10">
            <CardHeader className="flex flex-col gap-3 px-4 py-3">
                {/* ---------------- Header Row ---------------- */}
                <div className="flex flex-row items-center justify-between w-full">
                    <h2 className="text-xl font-bold">Rates</h2>

                    {/* Filter Group - Pushed to the right */}
                    <div className="flex items-center gap-2">
                        {/* Timeframe Select */}
                        <Select value={timeFrame} onValueChange={setTimeFrame}>
                            <SelectTrigger className="h-8 w-28">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {["current", "4h", "12h", "24h"].map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Multi-Select Popover */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 border-dashed">
                                    Protocols
                                    {selectedProtocols.length > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground font-mono">
                                            ({selectedProtocols.length})
                                        </span>
                                    )}
                                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-1" align="end">
                                <div className="p-1">
                                    <div
                                        className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                                        onClick={() => setSelectedProtocols([])}
                                    >
                                        <Checkbox checked={selectedProtocols.length === 0} />
                                        <span className="text-sm font-medium">All Protocols</span>
                                    </div>
                                    <div className="h-px bg-border my-1" />
                                    {allProtocols.map((p) => (
                                        <div
                                            key={p.key}
                                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                                            onClick={() => toggleProtocol(p.key)}
                                        >
                                            <Checkbox checked={selectedProtocols.includes(p.key)} />
                                            <span className="text-sm">{p.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* ---------------- Filter Chips Row ---------------- */}
                {selectedProtocols.length > 0 && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Filters:</span>
                        {selectedProtocols.map((key) => (
                            <Badge key={key} variant="secondary" className="pl-2 pr-1 py-0.5 text-xs font-normal">
                                {allProtocols.find(p => p.key === key)?.label}
                                <X
                                    className="ml-1.5 h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                                    onClick={() => toggleProtocol(key)}
                                />
                            </Badge>
                        ))}
                        <Button
                            variant="link"
                            size="sm"
                            className="h-6 px-1 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => setSelectedProtocols([])}
                        >
                            Reset
                        </Button>
                    </div>
                )}
            </CardHeader>

            {/* ---------------- Table Section ---------------- */}
            <CardContent className="pt-0">
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-semibold border-r border-border">
                                    Market
                                </TableHead>
                                {visibleGroups.map((group, idx) => (
                                    <TableHead
                                        key={group.key}
                                        colSpan={group.protocols.length}
                                        className={`text-center font-semibold text-base ${idx < visibleGroups.length - 1 ? "border-r-2 border-border" : ""
                                            }`}
                                    >
                                        {group.metric}
                                    </TableHead>
                                ))}
                            </TableRow>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="font-semibold border-r border-border">
                                    <span className="text-xs text-muted-foreground">
                                        {filteredPerps.length} markets
                                    </span>
                                </TableHead>
                                {visibleGroups.flatMap((group, groupIdx) =>
                                    group.protocols.map((protocol, protocolIdx) => {
                                        const isLastProtocol = protocolIdx === group.protocols.length - 1;
                                        const isLastGroup = groupIdx === visibleGroups.length - 1;
                                        return (
                                            <TableHead
                                                key={protocol.key}
                                                className={`text-center font-medium ${isLastProtocol && !isLastGroup ? "border-r-2 border-border" : ""
                                                    }`}
                                            >
                                                {protocol.label}
                                            </TableHead>
                                        );
                                    })
                                )}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filteredPerps.map((perp, idx) => (
                                <TableRow
                                    key={`${perp.name}-${idx}`}
                                    className="hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell className="font-medium border-r border-border">
                                        <div className="flex items-center gap-3">
                                            {perp.imageUrl ? (
                                                <Image
                                                    src={perp.imageUrl}
                                                    alt={perp.baseAsset}
                                                    width={24}
                                                    height={24}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                                    <span className="text-xs font-bold">
                                                        {perp.baseAsset.slice(0, 1)}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="font-semibold">{perp.name}</span>
                                        </div>
                                    </TableCell>

                                    {visibleGroups.flatMap((group, groupIdx) =>
                                        group.protocols.map((protocol, protocolIdx) => {
                                            const isLastProtocol = protocolIdx === group.protocols.length - 1;
                                            const isLastGroup = groupIdx === visibleGroups.length - 1;

                                            // Only show funding rates for Funding Rate group
                                            const rate = group.key === "funding"
                                                ? getFundingRate(perp.name, protocol.key)
                                                : "-";

                                            // Determine color based on rate value
                                            const rateValue = rate !== "-" ? parseFloat(rate) : 0;
                                            const isPositive = rateValue > 0;
                                            const isNegative = rateValue < 0;

                                            return (
                                                <TableCell
                                                    key={`${perp.name}-${protocol.key}`}
                                                    className={`text-center font-mono text-sm ${isLastProtocol && !isLastGroup ? "border-r-2 border-border" : ""
                                                        } ${rate !== "-"
                                                            ? isPositive
                                                                ? "text-green-500 dark:text-green-400 font-medium"
                                                                : isNegative
                                                                    ? "text-red-500 dark:text-red-400 font-medium"
                                                                    : "text-foreground font-medium"
                                                            : "text-muted-foreground"
                                                        }`}
                                                >
                                                    {rate}
                                                </TableCell>
                                            );
                                        })
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default RatesCard;