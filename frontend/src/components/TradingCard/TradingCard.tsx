"use client";

import React from "react";
import TradingCardHeader from "./TradingCardHeader";
import TradingViewWidget from "../custom/TradingViewWidget";
import TradingCardFooter from "./TardingCardFooter";
import TradingOrderPanel from "./TradingOrderPanel";

const TradingCard = () => {
    return (
        <div className="space-y-3 p-4">
            {/* HEADER */}
            <TradingCardHeader />

            {/* CHART + ORDER PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3">
                {/* TradingView Chart */}
                <div className="min-h-[500px] lg:min-h-[600px] overflow-hidden">
                    <TradingViewWidget symbol="SOLUSD" resolution="60" />
                </div>

                {/* Order Panel */}
                <div className="lg:sticky lg:top-4 h-fit">
                    <TradingOrderPanel />
                </div>
            </div>

            {/* FOOTER */}
            <TradingCardFooter />
        </div>
    );
};

export default TradingCard;