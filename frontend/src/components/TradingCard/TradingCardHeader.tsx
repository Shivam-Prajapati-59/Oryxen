import React from "react";
import { BadgeCheck, ChevronDown } from "lucide-react";

const TradingCardHeader = () => {
    return (
        <div className="flex flex-col md:flex-row items-stretch justify-between border dark:border-white/10 border-black/20">

            {/* LEFT SECTION: MARKET & PRICE */}
            <div className="flex flex-col lg:flex-row lg:justify-between justify-center p-5 gap-1">
                <div className="flex items-center gap-3">
                    {/* Solana Logo Placeholder */}
                    <div className="w-6 h-6 bg-linear-to-tr from-[#9945FF] to-[#14F195] rounded-sm shrink-0" />

                    <h2 className="text-xl font-ibm font-semibold tracking-wider">
                        SOL-PERP
                    </h2>

                    <BadgeCheck className="w-5 h-5 text-emerald-400" />

                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        100x
                    </span>

                    <div className="p-1 rounded-full bg-accent cursor-pointer hover:bg-accent/80 transition-colors">
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                </div>

                {/* PRICE */}
                <div className="mt-1">
                    <h2 className="text-2xl lg:text-3xl text-emerald-500 dark:text-emerald-400 font-ibm">
                        $145.2809
                    </h2>
                    <p className="hidden sm:block text-sm tracking-wide text-muted-foreground font-noto">
                        Price
                    </p>
                </div>
            </div>

            {/* RIGHT SECTION: THE STATS BOX */}
            <div className="flex flex-col lg:flex-row border-l dark:border-white/10 border-black/20 min-w-75">

                {/* ROW 1: CHANGE */}
                <div className="flex lg:flex-col justify-center items-center px-4 py-2 border-t border-b dark:border-white/10 border-black/20 lg:border-t-0 gap-2">
                    <p className="text-sm text-muted-foreground font-noto">
                        Change (24hr)
                    </p>
                    <h3 className="text-sm font-medium text-emerald-400 font-ibm">
                        0.59%
                    </h3>
                </div>

                {/* ROW 2: FUNDING */}
                <div className="flex lg:flex-col justify-center items-center px-4 py-2 border-b dark:border-white/10 border-black/20 lg:border-l gap-2">
                    <p className="text-sm text-muted-foreground font-noto">
                        OI-Weighted Funding (1hr)
                    </p>
                    <h3 className="text-sm font-medium text-foreground font-ibm">
                        0.00125%
                    </h3>
                </div>

                {/* ROW 3: TOTAL OI */}
                <div className="flex lg:flex-col justify-center items-center px-4 py-2 lg:border-l dark:border-white/10 border-black/20 gap-2">
                    <p className="text-sm text-muted-foreground font-noto">
                        Total OI Contracts
                    </p>
                    <h3 className="text-sm font-medium text-foreground font-ibm">
                        7,053,889.7822
                    </h3>
                </div>

            </div>
        </div>
    );
};

export default TradingCardHeader;