"use client";

import React, { useState } from "react";
import TradingCardHeader from "./TradingCardHeader";
import TradingViewWidget from "../custom/TradingViewWidget";
import TradingCardFooter from "./TardingCardFooter";
import TradingOrderPanel from "./TradingOrderPanel";
import TradingHeaderDialog from "./TradingHeaderDialog";

const TradingCard = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="p-4">
            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-3">

                {/* LEFT COLUMN - HEADER + CHART + FOOTER */}
                <div className="space-y-3">
                    <TradingCardHeader
                        isOpen={isDialogOpen}
                        setIsOpen={setIsDialogOpen}
                    />

                    <div className="h-[500px] lg:h-[600px] w-full relative">
                        {/* TradingView Widget - always mounted, just hidden */}
                        <div className={isDialogOpen ? "hidden" : "w-full h-full"}>
                            <TradingViewWidget symbol="SOLUSD" resolution="60" />
                        </div>

                        {/* Dialog - shown when open */}
                        {isDialogOpen && (
                            <div className="absolute inset-0">
                                <TradingHeaderDialog onClose={() => setIsDialogOpen(false)} />
                            </div>
                        )}
                    </div>

                    <TradingCardFooter />
                </div>

                {/* RIGHT COLUMN - ORDER PANEL */}
                <div className="lg:sticky lg:top-4 h-fit">
                    <TradingOrderPanel />
                </div>
            </div>
        </div>
    );
};

export default TradingCard;