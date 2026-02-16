"use client";

import React, { useState, useEffect } from "react";
import TradingCardHeader from "./TradingCardHeader";
import TradingViewWidget from "../custom/TradingViewWidget";
import TradingCardFooter from "./TardingCardFooter";
import TradingOrderPanel from "./TradingOrderPanel";
import TradingHeaderDialog from "./TradingHeaderDialog";
import { PerpFundingRate, useFundingRates } from "@/hooks/useFundingRates";
import Container from "../common/Container";

const TradingCard = () => {
    // 1. Fetch All Rates (Parent State)
    const { data: response, isLoading, isError } = useFundingRates("drift");
    const allPerps = response?.data;

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // 2. Initial State (Must match PerpFundingRate interface)
    const [selectedMarket, setSelectedMarket] = useState<PerpFundingRate>({
        protocol: "drift",
        symbol: "SOL-PERP",
        imageUrl: "https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg",
        maxleverage: 20,
        price: 0,
        fundingRate: 0,
        timestamp: Date.now(),
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
    });

    // 3. Effect: When API data loads, update the "dummy" initial state with real data
    useEffect(() => {
        if (allPerps && allPerps.length > 0) {
            // Find the currently selected symbol in the fresh API data
            const freshData = allPerps.find(p => p.symbol === selectedMarket.symbol && p.protocol === selectedMarket.protocol);
            if (freshData) {
                // Update state so Funding/OI are not 0
                setSelectedMarket(freshData);
            }
        }
    }, [allPerps, selectedMarket.symbol, selectedMarket.protocol]); // Only run when data is fetched

    const handleMarketSelect = (market: PerpFundingRate) => {
        setSelectedMarket(market);
        setIsDialogOpen(false);
    };

    return (
        <Container>
            {/* MAIN GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-3">

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