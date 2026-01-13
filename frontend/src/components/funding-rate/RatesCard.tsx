// RatesCard.tsx (Simplified)
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GROUPS } from "@/config/FundingRate";
import { usePerps } from "@/hooks/usePerps";
import { useAllFundingRates, type PerpFundingRate } from "@/hooks/useFundingRates";
import RatesTableHeader from "./RatesTableHeader";
import RatesTableBody from "./RatesTableBody";

const RatesCard = () => {
    const [timeFrame, setTimeFrame] = useState("current");
    const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);

    const { data: perps, isLoading: perpsLoading, isError: perpsError, error: perpsErrorMsg } = usePerps();
    const { drift, hyperliquid, isLoading: ratesLoading } = useAllFundingRates();

    const allProtocols = useMemo(() => GROUPS.flatMap((g) => g.protocols), []);

    const visibleGroups = useMemo(() => {
        return GROUPS.map((group) => ({
            ...group,
            protocols: group.protocols.filter(
                (p) => selectedProtocols.length === 0 || selectedProtocols.includes(p.key)
            ),
        })).filter((group) => group.protocols.length > 0);
    }, [selectedProtocols]);

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

    const fundingRatesMap = useMemo(() => {
        const map = new Map<string, { drift?: PerpFundingRate; hyperliquid?: PerpFundingRate }>();

        drift.data?.data.forEach((rate) => {
            const existing = map.get(rate.symbol) || {};
            map.set(rate.symbol, { ...existing, drift: rate });
        });

        hyperliquid.data?.data.forEach((rate) => {
            const existing = map.get(rate.symbol) || {};
            map.set(rate.symbol, { ...existing, hyperliquid: rate });
        });

        return map;
    }, [drift.data, hyperliquid.data]);

    const getFundingRate = (perpName: string, protocolKey: string, timeframe: string): string => {
        let rateData = fundingRatesMap.get(perpName);

        if (!rateData) {
            const baseAsset = perpName.replace(/USDT?|PERP|-PERP|-USD/gi, "").trim();
            const perpSymbol = `${baseAsset}-PERP`;
            rateData = fundingRatesMap.get(perpSymbol);
        }

        if (!rateData) return "-";

        const protocol = protocolKey === "drift" ? rateData.drift : rateData.hyperliquid;
        if (!protocol) return "-";

        const timeframeMap: Record<string, keyof typeof protocol.projections> = {
            current: "current",
            "4h": "h4",
            "8h": "h8",
            "12h": "h12",
            "24h": "d1",
            "7d": "d7",
            "30d": "d30",
            apr: "apr",
        };

        const projectionKey = timeframeMap[timeframe] || "current";
        const value = protocol.projections[projectionKey];
        return value != null ? String(value) : "-";
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
            <CardHeader>
                <RatesTableHeader
                    timeFrame={timeFrame}
                    setTimeFrame={setTimeFrame}
                    selectedProtocols={selectedProtocols}
                    setSelectedProtocols={setSelectedProtocols}
                    allProtocols={allProtocols}
                />
            </CardHeader>

            <CardContent className="pt-0">
                <RatesTableBody
                    filteredPerps={filteredPerps}
                    visibleGroups={visibleGroups}
                    getFundingRate={getFundingRate}
                    timeFrame={timeFrame}
                />
            </CardContent>
        </Card>
    );
};

export default RatesCard;