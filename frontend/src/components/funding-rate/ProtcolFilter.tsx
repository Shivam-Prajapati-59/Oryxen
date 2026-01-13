// ProtocolFilter.tsx
"use client";

import React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface ProtocolFilterProps {
    selectedProtocols: string[];
    setSelectedProtocols: React.Dispatch<React.SetStateAction<string[]>>;
    allProtocols: Array<{ key: string; label: string }>;
}

const ProtocolFilter: React.FC<ProtocolFilterProps> = ({
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
    );
};

export default ProtocolFilter;