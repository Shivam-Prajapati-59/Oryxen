"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { p } from "motion/react-client";

/* -------------------------------------------------
   DUMMY DATA
-------------------------------------------------- */

const OVERVIEW_DATA = [
    { value: "0.00125%", label: "BTC OI-weighted funding rate" },
    { value: "0.000947%", label: "SOL OI-weighted funding rate" },
    { value: "0.00125%", label: "ETH OI-weighted funding rate" },
];

const OverviewCard = () => {
    return (
        <Card className="w-full dark:border-white/10 border-black/20">
            {/* Header Section */}
            <CardHeader className="border-b">
                <h2 className="text-xl font-bold tracking-tight text-red-500">
                    OverView
                </h2>
            </CardHeader>

            {/* Table Section */}
            <CardContent className="pt-0">
                {OVERVIEW_DATA.map((item) => (
                    <div
                        key={item.label}
                        className="px-4 py-2 flex flex-row md:flex-col gap-0.5"
                    >
                        <span className="text-green-400 text-base font-mono leading-tight">
                            {item.value}
                        </span>
                        <span className="text-sm text-muted-foreground uppercase tracking-wide leading-tight">
                            {item.label}
                        </span>
                    </div>
                ))}
            </CardContent>

            {/* TODO: Implement dynamic data fetching from Drift/Hyperliquid SDKs based on the selected timeFrame */}
            {/* TODO: Add sorting logic for the Rate column */}
        </Card>
    );
};

export default OverviewCard;
