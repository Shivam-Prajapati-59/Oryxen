// RatesTableHeader.tsx
"use client";

import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import ProtocolFilter from "./ProtcolFilter";

interface RatesTableHeaderProps {
    timeFrame: string;
    setTimeFrame: (value: string) => void;
    selectedProtocols: string[];
    setSelectedProtocols: React.Dispatch<React.SetStateAction<string[]>>;
    allProtocols: Array<{ key: string; label: string }>;
}

const RatesTableHeader: React.FC<RatesTableHeaderProps> = ({
    timeFrame,
    setTimeFrame,
    selectedProtocols,
    setSelectedProtocols,
    allProtocols,
}) => {
    const toggleProtocol = (key: string) => {
        setSelectedProtocols((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    return (
        <div className="flex flex-col gap-3 px-4 py-3">
            {/* Header Row */}
            <div className="flex flex-row items-center justify-between w-full">
                <h2 className="text-xl font-bold">Rates</h2>

                {/* Filter Group */}
                <div className="flex items-center gap-2">
                    {/* Timeframe Select */}
                    <Select value={timeFrame} onValueChange={setTimeFrame}>
                        <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {["current", "4h", "8h", "12h", "24h", "7d", "30d", "apr"].map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Protocol Filter */}
                    <ProtocolFilter
                        selectedProtocols={selectedProtocols}
                        setSelectedProtocols={setSelectedProtocols}
                        allProtocols={allProtocols}
                    />
                </div>
            </div>

            {/* Filter Chips Row */}
            {selectedProtocols.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Filters:
                    </span>
                    {selectedProtocols.map((key) => (
                        <Badge
                            key={key}
                            variant="secondary"
                            className="pl-2 pr-1 py-0.5 text-xs font-normal"
                        >
                            {allProtocols.find((p) => p.key === key)?.label}
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
        </div>
    );
};

export default RatesTableHeader;