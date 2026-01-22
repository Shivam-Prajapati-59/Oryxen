"use client";
import { useAllPerps, PerpBasicInfo } from "@/hooks/useAllPerps";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { BadgeCheck, Stone, X, Search, Activity, Zap } from "lucide-react";
import Image from "next/image";

interface TradingHeaderDialogProps {
    onClose: () => void;
    onSelectMarket: (market: PerpBasicInfo) => void;
}

const ITEM_HEIGHT = 64; // Height of each row in pixels

const TradingHeaderDialog = ({ onClose, onSelectMarket }: TradingHeaderDialogProps) => {
    const { data, isLoading, error } = useAllPerps();
    const [search, setSearch] = useState("");
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    // Virtualization state
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 15 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 1. Filter and Sort Logic
    const filteredPerps = useMemo(() => {
        if (!data) return [];
        return data.filter(
            (perp) =>
                perp.symbol.toLowerCase().includes(search.toLowerCase()) ||
                perp.protocol.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

    // 2. Efficient Price Feed Subscription (Only for what the user sees)
    const visibleSymbols = useMemo(() => {
        const buffer = 5;
        const start = Math.max(0, visibleRange.start - buffer);
        const end = Math.min(filteredPerps.length, visibleRange.end + buffer);

        return filteredPerps
            .slice(start, end)
            .map((perp) => perp.symbol.replace(/-PERP$/i, ""))
            .filter((symbol, index, self) => self.indexOf(symbol) === index);
    }, [filteredPerps, visibleRange]);

    const { prices, isConnected } = usePriceFeed(visibleSymbols);

    // 3. Virtualization Scroll Handler
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const start = Math.floor(container.scrollTop / ITEM_HEIGHT);
            const end = start + Math.ceil(container.clientHeight / ITEM_HEIGHT);
            setVisibleRange({ start, end });
        };

        container.addEventListener("scroll", handleScroll);
        handleScroll(); // Initial calculation
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    // Reset scroll on search
    useEffect(() => {
        setVisibleRange({ start: 0, end: 15 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [search]);

    // 4. Formatting Helpers
    const formatPrice = (price: number | null | undefined): string => {
        if (!price || isNaN(price)) return "-";
        if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    const handleMarketClick = (perp: PerpBasicInfo) => {
        onSelectMarket(perp);
    };

    if (isLoading) return (
        <div className="flex h-96 items-center justify-center bg-background/80 backdrop-blur-sm">
            <Activity className="w-6 h-6 animate-pulse text-emerald-500" />
        </div>
    );

    if (error) return (
        <div className="flex h-96 items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-red-500">Error loading markets</div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-background border dark:border-white/10 border-black/20 rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-secondary/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Zap className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Select Market</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Search */}
            <div className="p-4 bg-background">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search by asset or protocol (e.g. SOL, Drift)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-white/5 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Labels */}
            <div className="grid grid-cols-[1.5fr_1fr_0.8fr] gap-4 px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5">
                <span>Asset / Max Lev</span>
                <span className="text-right">Price</span>
                <span className="text-right">Protocol</span>
            </div>

            {/* Markets List */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredPerps.length > 0 ? (
                    <div className="relative" style={{ height: `${filteredPerps.length * ITEM_HEIGHT}px` }}>
                        {filteredPerps.slice(visibleRange.start, visibleRange.end).map((perp, idx) => {
                            const absoluteIndex = visibleRange.start + idx;
                            const baseSymbol = perp.symbol.replace(/-PERP$/i, "");
                            const price = prices[baseSymbol];

                            return (
                                <div
                                    key={`${perp.protocol}-${perp.symbol}`}
                                    onClick={() => handleMarketClick(perp)}
                                    className="absolute left-0 right-0 grid grid-cols-[1.5fr_1fr_0.8fr] gap-4 items-center px-6 py-4 hover:bg-emerald-500/[0.03] active:bg-emerald-500/[0.06] cursor-pointer transition-colors group border-b border-white/5"
                                    style={{ top: `${absoluteIndex * ITEM_HEIGHT}px`, height: `${ITEM_HEIGHT}px` }}
                                >
                                    {/* Asset Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 h-8 shrink-0">
                                            {failedImages.has(perp.symbol) || !perp.imageUrl ? (
                                                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">
                                                    <Stone className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            ) : (
                                                <Image
                                                    src={perp.imageUrl}
                                                    alt={perp.symbol}
                                                    fill
                                                    className="rounded-full object-cover"
                                                    onError={() => setFailedImages(prev => new Set(prev).add(perp.symbol))}
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm group-hover:text-emerald-400 transition-colors">
                                                    {perp.symbol}
                                                </span>
                                                <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
                                            </div>
                                            <span className="text-[10px] text-emerald-500/80 font-mono font-bold">
                                                {perp.maxleverage || "-"}x Max
                                            </span>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right font-mono text-sm font-medium">
                                        {price !== null && price !== undefined ? (
                                            <span className="text-foreground">{formatPrice(price)}</span>

                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </div>

                                    {/* Protocol */}
                                    <div className="text-right">
                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-secondary text-muted-foreground uppercase border border-white/5">
                                            {perp.protocol || "-"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                        <Search className="w-12 h-12 text-white/5 mb-4" />
                        <h3 className="text-lg font-medium">No markets found</h3>
                        <p className="text-sm text-muted-foreground">Try searching for a different token or protocol.</p>
                    </div>
                )}
            </div>

            {/* Status Footer */}
            <div className="p-4 bg-secondary/30 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            {isConnected ? "Pyth Oracle Live" : "Oracle Offline"}
                        </span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        {filteredPerps.length} Pairs Available
                    </span>
                </div>
                <div className="text-[10px] font-bold text-emerald-500/50 uppercase italic">
                    Oryxen Network
                </div>
            </div>
        </div>
    );
};

export default TradingHeaderDialog;