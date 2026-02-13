"use client";
import { BadgeCheck, ChevronDown } from "lucide-react";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { PerpBasicInfo } from "@/hooks/useAllPerps";
import Image from "next/image";
import { useState, useEffect } from "react";

interface TradingCardHeaderProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    selectedMarket: PerpBasicInfo;
}

const TradingCardHeader = ({ isOpen, setIsOpen, selectedMarket }: TradingCardHeaderProps) => {
    const baseSymbol = selectedMarket.symbol.replace(/-PERP$/i, "");

    // 2. Hooks
    const { prices } = usePriceFeed([baseSymbol]);
    const [imageError, setImageError] = useState(false);

    // Reset image error when market changes
    useEffect(() => {
        setImageError(false);
    }, [selectedMarket]);

    const currentPrice = prices[baseSymbol];

    // --- Formatters ---

    const formatPrice = (price: number | null | undefined): string => {
        if (!price || isNaN(price)) return "-";
        if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    const formatFunding = (rate: number): string => {
        // Rate is usually hourly decimal (e.g. 0.0001). Convert to %.
        const percentage = rate * 100;
        return `${percentage > 0 ? "+" : ""}${percentage.toFixed(4)}%`;
    };

    const formatOI = (oi: number): string => {
        if (!oi) return "-";
        if (oi >= 1_000_000) return `${(oi / 1_000_000).toFixed(2)}M`;
        if (oi >= 1_000) return `${(oi / 1_000).toFixed(1)}K`;
        return oi.toLocaleString();
    };

    // Calculate 24h Change (Optional: You need 24h Open Price from API to calculate this accurately. 
    // For now, leaving as placeholder or you can implement if API provides 'price24hAgo')
    const priceChange = "-";

    return (
        <div className="flex flex-col md:flex-row items-stretch justify-between border dark:border-white/10 border-black/20">

            {/* LEFT SECTION: MARKET & PRICE */}
            <div className="flex flex-col lg:flex-row lg:justify-between justify-center p-5 gap-1 lg:flex-1">
                <div className="flex items-center gap-3 relative">
                    {/* Market Logo */}
                    {selectedMarket.imageUrl && !imageError ? (
                        <Image
                            src={selectedMarket.imageUrl}
                            alt={selectedMarket.symbol}
                            width={24}
                            height={24}
                            className="rounded-sm shrink-0"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-6 h-6 bg-linear-to-tr from-[#9945FF] to-[#14F195] rounded-sm shrink-0" />
                    )}

                    <h2 className="text-xl font-ibm font-semibold tracking-wider">
                        {selectedMarket.symbol}
                    </h2>

                    <BadgeCheck className="w-5 h-5 text-emerald-400" />

                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        {selectedMarket.maxleverage}x
                    </span>

                    <div
                        className="p-1 rounded-full bg-accent cursor-pointer hover:bg-accent/80 transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* PRICE */}
                <div className="lg:ml-auto lg:text-right">
                    <h2 className="text-2xl lg:text-3xl text-emerald-500 dark:text-emerald-400 font-mono">
                        {formatPrice(currentPrice)}
                    </h2>
                    <p className="hidden sm:block text-sm tracking-wide text-muted-foreground font-noto">
                        Live Price
                    </p>
                </div>
            </div>

            {/* RIGHT SECTION: THE STATS BOX */}
            <div className="flex flex-col lg:flex-row border-l dark:border-white/10 border-black/20 min-w-75">

                {/* ROW 1: CHANGE */}
                <div className="flex lg:flex-col justify-center items-center px-4 py-2 border-t border-b dark:border-white/10 border-black/20 lg:border-t-0 gap-2 lg:border-b-0">
                    <p className="text-sm text-muted-foreground font-noto">
                        Change (24hr)
                    </p>
                    <h3 className="text-sm font-medium text-muted-foreground font-ibm">
                        {priceChange}
                    </h3>
                </div>

                {/* ROW 2: FUNDING */}
                <div className="flex lg:flex-col justify-center items-center px-4 py-2 border-b dark:border-white/10 border-black/20 lg:border-l gap-2 lg:border-b-0">
                    <p className="text-sm text-muted-foreground font-noto">
                        OI-Weighted Funding (1hr)
                    </p>
                    <h3 className="text-sm font-medium text-muted-foreground font-ibm">
                        -
                    </h3>
                </div>

                {/* ROW 3: TOTAL OI */}
                <div className="flex lg:flex-col justify-center items-center px-4 py-2 lg:border-l dark:border-white/10 border-black/20 gap-2">
                    <p className="text-sm text-muted-foreground font-noto">
                        Total OI Contracts
                    </p>
                    <h3 className="text-sm font-medium text-muted-foreground font-ibm">
                        -
                    </h3>
                </div>

            </div>
        </div>
    );
};

export default TradingCardHeader;