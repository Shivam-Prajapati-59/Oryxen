"use client";

import React, { useState, useMemo } from "react";
import TradingCardHeader from "./TradingCardHeader";
import TradingViewWidget from "../custom/TradingViewWidget";
import TradingCardFooter from "./TradingCardFooter";
import TradingOrderPanel from "./TradingOrderPanel";
import TradingHeaderDialog from "./TradingHeaderDialog";
import { PerpFundingRate, useFundingRates } from "@/hooks/useFundingRates";
import { useGmxsolMarkets } from "@/hooks/useGmxsolMarkets";
import Container from "../common/Container";

const DEFAULT_SELECTED_MARKET: PerpFundingRate = {
    protocol: "drift",
    symbol: "SOL-PERP",
    imageUrl: "https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg",
    maxleverage: 20,
    price: 0,
    fundingRate: 0,
    timestamp: 0,
    projections: {
        current: 0,
        h4: 0,
        h8: 0,
        h12: 0,
        d1: 0,
        d7: 0,
        d30: 0,
        apr: 0
    },
    metadata: {
        contractIndex: 0,
        baseCurrency: "",
        quoteCurrency: "",
        openInterest: "0",
        indexPrice: "0",
        nextFundingRate: "0",
        nextFundingRateTimestamp: "0",
        high24h: "0",
        low24h: "0",
        volume24h: "0"
    }
};

const TradingCard = () => {
    // 1. Fetch Drift Rates
    const { data: response, isLoading: driftLoading, isError: driftError } = useFundingRates("drift");
    const driftPerps = useMemo(() => response?.data ?? [], [response?.data]);

    // 2. Fetch GMXSol Markets
    const { data: gmxsolPerps, isLoading: gmxsolLoading, isError: gmxsolError } = useGmxsolMarkets();

    // 3. Merge all markets
    const isLoading = driftLoading || gmxsolLoading;
    const isError = driftError || gmxsolError;
    const allPerps = useMemo(() => {
        const combined = [...driftPerps, ...(gmxsolPerps ?? [])];
        return combined;
    }, [driftPerps, gmxsolPerps]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedMarketKey, setSelectedMarketKey] = useState(() => ({
        protocol: DEFAULT_SELECTED_MARKET.protocol,
        symbol: DEFAULT_SELECTED_MARKET.symbol,
    }));
    const selectedMarket = useMemo(
        () =>
            allPerps.find(
                (market) =>
                    market.symbol === selectedMarketKey.symbol &&
                    market.protocol === selectedMarketKey.protocol,
            ) ?? DEFAULT_SELECTED_MARKET,
        [allPerps, selectedMarketKey],
    );

    const handleMarketSelect = (market: PerpFundingRate) => {
        setSelectedMarketKey({
            protocol: market.protocol,
            symbol: market.symbol,
        });
        setIsDialogOpen(false);
    };

    return (
        <Container>
            {/* MAIN GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-3 pb-8">

                {/* LEFT COLUMN - HEADER + CHART + FOOTER */}
                <div className="space-y-3">
                    <TradingCardHeader
                        isOpen={isDialogOpen}
                        setIsOpen={setIsDialogOpen}
                        selectedMarket={selectedMarket}
                    />

                    <div className="h-[500px] lg:h-[600px] w-full relative">
                        {/* TradingView Widget - always mounted, just hidden */}
                        <div className={isDialogOpen ? "hidden" : "w-full h-full"}>
                            <TradingViewWidget
                                symbol={selectedMarket.symbol.replace("-PERP", "USD")}
                                resolution="60"
                            />
                        </div>

                        {/* Dialog - shown when open */}
                        {isDialogOpen && (
                            <div className="absolute inset-0">
                                {/* Note: Ensure your TradingHeaderDialog accepts 'markets' prop */}
                                <TradingHeaderDialog
                                    onClose={() => setIsDialogOpen(false)}
                                    onSelectMarket={handleMarketSelect}
                                    markets={allPerps || []}
                                    isLoading={isLoading}
                                    error={isError}
                                />
                            </div>
                        )}
                    </div>

                    <TradingCardFooter />
                </div>

                {/* RIGHT COLUMN - ORDER PANEL */}
                <div className="xl:sticky xl:top-4 h-full">
                    <TradingOrderPanel
                        baseSymbol={selectedMarket.symbol.replace(/-PERP$/i, "")}
                        marketIndex={selectedMarket.metadata?.contractIndex ?? 0}
                    />
                </div>
            </div>
        </Container>
    );
};

export default TradingCard;
