import React from 'react'
import Container from '@/components/common/Container'
import TopFundingRates from '@/components/funding-rate/TopFundingRates';
import LowFundingRates from '@/components/funding-rate/LowFundingRates';
import RatesCard from '@/components/funding-rate/RatesCard';
import OverviewCard from '@/components/funding-rate/OverviewCard1';

export default async function FundingRatePage() {
    return (
        <Container className="py-8">
            <div className='flex flex-col gap-8'>
                {/* Page Header */}
                <div>
                    <h1 className="text-4xl font-bold mb-2">Funding Rate</h1>
                    <p className="text-muted-foreground">
                        View perpetual contracts across different protocols
                    </p>
                </div>

                {/* Top Section - Overview, Highest and Lowest Funding Rates in one row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <OverviewCard />
                    <TopFundingRates />
                    <LowFundingRates />
                </div>

                {/* Bottom Section - Full Rates Table */}
                <div className="w-full">
                    <RatesCard />
                </div>
            </div>
        </Container>
    )
}