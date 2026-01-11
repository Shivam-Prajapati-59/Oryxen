import React from "react";
import Container from "@/components/common/Container";
import TopFundingRates from "@/components/funding-rate/TopFundingRates";
import LowFundingRates from "@/components/funding-rate/LowFundingRates";
import RatesCard from "@/components/funding-rate/RatesCard";
import OverviewCard from "@/components/funding-rate/OverviewCard1";

export default async function FundingRatePage() {
    return (
        <Container className="py-6 md:py-8">
            <div className="flex flex-col gap-6 md:gap-8">
                {/* Page Header */}
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-bold">Funding Rate</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        View perpetual contracts across different protocols
                    </p>
                </div>

                {/* Top Section */}
                <div
                    className="
            grid grid-cols-1 
            md:grid-cols-2 
            lg:grid-cols-3 
            gap-4 md:gap-6
          "
                >
                    {/* Overview should feel primary */}
                    <div className="md:col-span-2 lg:col-span-1">
                        <OverviewCard />
                    </div>

                    <TopFundingRates />
                    <LowFundingRates />
                </div>

                {/* Bottom Section */}
                <div className="w-full">
                    <RatesCard />
                </div>
            </div>
        </Container>
    );
}
