"use client";

import React, { useState, useEffect } from "react";
import TradingCardHeader from "./TradingCardHeader";
import TradingViewWidget from "../custom/TradingViewWidget";
import TradingCardFooter from "./TardingCardFooter";
import TradingOrderPanel from "./TradingOrderPanel";
import TradingHeaderDialog from "./TradingHeaderDialog";
import { PerpBasicInfo, useDriftPerps } from "@/hooks/useAllPerps";
import Container from "../common/Container";

const TradingCard = () => {
    // 1. Fetch Drift Perps (Parent State)
    const { data: driftPerps, isLoading } = useDriftPerps();

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // 2. Initial State (Must match PerpBasicInfo interface including new fields)
    const [selectedMarket, setSelectedMarket] = useState<PerpBasicInfo>({
        protocol: "drift",
        symbol: "SOL-PERP",
        imageUrl: "https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg",
        maxleverage: 20,
        marketIndex: 0,
    });

    // 3. Effect: When API data loads, update the "dummy" initial state with real data
    useEffect(() => {
        if (driftPerps && driftPerps.length > 0) {
            // Find the currently selected symbol in the fresh API data
            const freshData = driftPerps.find(p => p.symbol === selectedMarket.symbol);
            if (freshData) {
                // Update state so Funding/OI are not 0
                setSelectedMarket(freshData);
            }
        }
    }, [driftPerps]); // Only run when data is fetched

    const handleMarketSelect = (market: PerpBasicInfo) => {
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
                                // You are passing 'markets' here, ensure the Dialog uses this prop 
                                // instead of fetching internally if that's your intent.
                                // If using my previous Dialog code, you might need to update it to accept this prop.
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
                        marketIndex={selectedMarket.marketIndex}
                    />
                </div>
            </div>
        </Container>
    );
};

export default TradingCard;