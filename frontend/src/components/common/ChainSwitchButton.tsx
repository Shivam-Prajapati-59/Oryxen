"use client";

import { useState, useEffect } from "react";
import { getSolanaNetwork, setSolanaNetwork } from "@/config/env";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";

const NETWORKS = [
    { value: "devnet" as const, label: "Devnet", color: "text-yellow-500" },
    { value: "mainnet" as const, label: "Mainnet", color: "text-emerald-500" },
];

const ChainSwitchButton = () => {
    const [current, setCurrent] = useState<"devnet" | "mainnet">("devnet");

    // Read persisted network on mount (client-only)
    useEffect(() => {
        setCurrent(getSolanaNetwork());
    }, []);

    const handleSwitch = (network: "devnet" | "mainnet") => {
        if (network === current) return;
        setSolanaNetwork(network); // persists + reloads
    };

    const activeNetwork = NETWORKS.find((n) => n.value === current)!;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    <span className={activeNetwork.color}>{activeNetwork.label}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {NETWORKS.map((net) => (
                    <DropdownMenuItem
                        key={net.value}
                        onClick={() => handleSwitch(net.value)}
                        className="flex items-center justify-between gap-4"
                    >
                        <span className={net.color}>{net.label}</span>
                        {current === net.value && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ChainSwitchButton;