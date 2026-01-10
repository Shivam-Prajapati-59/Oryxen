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

import { GROUPS, MARKETS, DATA } from "@/config/FundingRate";

const RatesCard = () => {
    const [timeFrame, setTimeFrame] = useState("current");
    const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);

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
                <Table>
                    <TableHeader className="border-t border-border">
                        <TableRow className="border-b">
                            <TableHead className="border-r border-border" />
                            {visibleGroups.map((group, idx) => (
                                <TableHead
                                    key={group.key}
                                    colSpan={group.protocols.length}
                                    className={`text-center font-semibold text-lg ${idx < visibleGroups.length - 1 ? "border-r border-border" : ""
                                        }`}
                                >
                                    {group.metric}
                                </TableHead>
                            ))}
                        </TableRow>
                        <TableRow className="border-b">
                            <TableHead className="font-semibold border-r border-border text-xs uppercase tracking-wider">
                                Market
                            </TableHead>
                            {visibleGroups.flatMap((group, groupIdx) =>
                                group.protocols.map((protocol, protocolIdx) => {
                                    const isLastProtocol = protocolIdx === group.protocols.length - 1;
                                    const isLastGroup = groupIdx === visibleGroups.length - 1;
                                    return (
                                        <TableHead
                                            key={protocol.key}
                                            className={`text-center font-medium ${isLastProtocol && !isLastGroup ? "border-r border-border" : ""
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
                        {MARKETS.map((market) => (
                            <TableRow key={market} className="hover:bg-muted/50 border-none">
                                <TableCell className="font-bold border-r border-border">{market}</TableCell>
                                {visibleGroups.flatMap((group, groupIdx) =>
                                    group.protocols.map((protocol, protocolIdx) => {
                                        const isLastProtocol = protocolIdx === group.protocols.length - 1;
                                        const isLastGroup = groupIdx === visibleGroups.length - 1;
                                        const value = DATA[market]?.[group.key]?.[protocol.key] || "-";
                                        return (
                                            <TableCell
                                                key={`${market}-${protocol.key}`}
                                                className={`text-center font-mono ${isLastProtocol && !isLastGroup ? "border-r border-border" : ""
                                                    }`}
                                            >
                                                {value}
                                            </TableCell>
                                        );
                                    })
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default RatesCard;