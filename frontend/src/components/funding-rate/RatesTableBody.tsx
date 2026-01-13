// RatesTableBody.tsx
"use client";

import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import type { PerpData } from "@/hooks/usePerps";

interface Group {
    key: string;
    metric: string;
    protocols: Array<{ key: string; label: string }>;
}

interface RatesTableBodyProps {
    filteredPerps: PerpData[];
    visibleGroups: Group[];
    getFundingRate: (perpName: string, protocolKey: string, timeframe: string) => string;
    timeFrame: string;
}

const RatesTableBody: React.FC<RatesTableBodyProps> = ({
    filteredPerps,
    visibleGroups,
    getFundingRate,
    timeFrame,
}) => {
    return (
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
                                        className={`text-center font-medium ${isLastProtocol && !isLastGroup
                                            ? "border-r-2 border-border"
                                            : ""
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
                                    const isLastProtocol =
                                        protocolIdx === group.protocols.length - 1;
                                    const isLastGroup = groupIdx === visibleGroups.length - 1;

                                    const rate =
                                        group.key === "funding"
                                            ? getFundingRate(perp.name, protocol.key, timeFrame)
                                            : "-";

                                    const rateValue = rate !== "-" ? parseFloat(rate) : 0;
                                    const isPositive = rateValue > 0;
                                    const isNegative = rateValue < 0;

                                    return (
                                        <TableCell
                                            key={`${perp.name}-${protocol.key}`}
                                            className={`text-center font-mono text-sm ${isLastProtocol && !isLastGroup
                                                ? "border-r-2 border-border"
                                                : ""
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
    );
};

export default RatesTableBody;