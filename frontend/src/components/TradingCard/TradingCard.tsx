"use client";

import React, { useState } from "react";
import TradingCardHeader from "./TradingCardHeader";
import TradingViewWidget from "../custom/TradingViewWidget";
import TradingCardFooter from "./TardingCardFooter";
import TradingOrderPanel from "./TradingOrderPanel";
import TradingHeaderDialog from "./TradingHeaderDialog";
import { PerpBasicInfo } from "@/hooks/useAllPerps";
import Container from "../common/Container";

const TradingCard = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<PerpBasicInfo>({
        protocol: "drift",
        symbol: "SOL-PERP",
        imageUrl: "https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg",
        maxleverage: 100,
    });

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
                                <TradingHeaderDialog
                                    onClose={() => setIsDialogOpen(false)}
                                    onSelectMarket={handleMarketSelect}
                                />
                            </div>
                        )}
                    </div>

                    <TradingCardFooter />
                </div>

                {/* RIGHT COLUMN - ORDER PANEL */}
                <div className="xl:sticky xl:top-4 h-fit">
                    <TradingOrderPanel />
                </div>
            </div>
        </Container>
    );
};

export default TradingCard;