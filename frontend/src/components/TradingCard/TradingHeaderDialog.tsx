import { PerpFundingRate } from "@/hooks/useFundingRates";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { BadgeCheck, Search, Activity, XCircle, TrendingUp, Layers } from "lucide-react";
import Image from "next/image";

interface TradingHeaderDialogProps {
    onClose: () => void;
    onSelectMarket: (market: PerpFundingRate) => void;
    markets: PerpFundingRate[];
    isLoading: boolean;
    error?: boolean;
}

const ITEM_HEIGHT = 72; // Slightly taller for better touch target/readability

// --- Sub-component: Smart Asset Icon ---
const AssetIcon = ({ url, symbol }: { url?: string; symbol: string }) => {
    const [error, setError] = useState(false);

    // Reset error state if url changes
    useEffect(() => { setError(false); }, [url]);

    if (!url || error) {
        // Fallback: A gradient avatar with the first letter
        const firstLetter = symbol.charAt(0).toUpperCase();
        return (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-sidebar-border to-sidebar-accent flex items-center justify-center border border-border/50 shadow-sm">
                <span className="text-[10px] font-black text-foreground/70 font-mono">
                    {firstLetter}
                </span>
            </div>
        );
    }

    return (
        <Image
            src={url}
            alt={symbol}
            fill
            className="rounded-full object-cover"
            onError={() => setError(true)}
        />
    );
};

const TradingHeaderDialog = ({ onClose, onSelectMarket, markets: data, isLoading, error }: TradingHeaderDialogProps) => {
    const [search, setSearch] = useState("");

    // Virtualization state
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 15 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 1. Filter Logic
    const filteredPerps = useMemo(() => {
        if (!data) return [];
        return data.filter(
            (perp) =>
                perp.symbol.toLowerCase().includes(search.toLowerCase()) ||
                perp.protocol.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

    // 2. Efficient Price Feed Subscription
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
        handleScroll();
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    // Reset scroll on search
    useEffect(() => {
        setVisibleRange({ start: 0, end: 15 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [search]);

    // Formatters
    const formatPrice = (price: number | null | undefined): string => {
        if (!price || isNaN(price)) return "-";
        if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    const formatNumber = (num: number | undefined, suffix: string = "") => {
        if (num === undefined) return "-";
        return `${(num * 100).toFixed(2)}%${suffix}`;
    };

    const formatBigNumber = (valStr: string | undefined) => {
        if (!valStr) return "-";
        const val = parseFloat(valStr);
        if (isNaN(val)) return "-";
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
        return `$${val.toFixed(0)}`;
    };

    if (isLoading) return (
        <div className="flex h-96 w-full items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col items-center gap-2">
                <Activity className="w-8 h-8 animate-pulse text-primary" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Syncing Markets</span>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex h-96 w-full items-center justify-center bg-background rounded-xl border border-destructive/20">
            <div className="text-destructive flex flex-col items-center gap-2">
                <XCircle className="w-8 h-8" />
                <span className="font-medium">Failed to load markets</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-background border border-border">

            {/* --- Header Search Section --- */}
            <div className="p-4 bg-background border-b border-border space-y-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search asset, protocol..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-transparent focus:bg-background focus:border-ring/30 focus:ring-1 focus:ring-ring/10 outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* --- Table Headers --- */}
            <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-4 px-6 py-3 bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                <span className="flex items-center gap-1">Asset</span>
                <span className="text-right">Price</span>
                <span className="text-right flex items-center justify-end gap-1">APR <TrendingUp className="w-3 h-3" /></span>
                <span className="text-right">24h Vol</span>
                <span className="text-right">OI</span>
                <span className="text-right">Source</span>
            </div>

            {/* --- Scrollable List (No Scrollbar) --- */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-background relative"
            >
                {filteredPerps.length > 0 ? (
                    <div className="relative w-full" style={{ height: `${filteredPerps.length * ITEM_HEIGHT}px` }}>
                        {filteredPerps.slice(visibleRange.start, visibleRange.end).map((perp, idx) => {
                            const absoluteIndex = visibleRange.start + idx;
                            const baseSymbol = perp.symbol.replace(/-PERP$/i, "");
                            const price = prices[baseSymbol] ?? perp.price;
                            const fundingPositive = (perp.projections?.apr || 0) > 0;

                            return (
                                <div
                                    key={`${perp.protocol}-${perp.symbol}`}
                                    onClick={() => {
                                        onSelectMarket(perp);
                                        onClose();
                                    }}
                                    className="absolute left-0 right-0 grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-4 items-center px-6 border-b border-border/40 hover:bg-secondary/60 cursor-pointer transition-all group"
                                    style={{
                                        top: `${absoluteIndex * ITEM_HEIGHT}px`,
                                        height: `${ITEM_HEIGHT}px`
                                    }}
                                >
                                    {/* Asset & Leverage */}
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-10 h-10 shrink-0 shadow-sm rounded-full bg-background">
                                            <AssetIcon url={perp.imageUrl} symbol={perp.symbol} />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                    {baseSymbol}
                                                </span>
                                                <BadgeCheck className="w-3.5 h-3.5 text-primary/80" />
                                            </div>
                                            <div className="flex items-center mt-0.5">
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                                    {perp.maxleverage}x
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right">
                                        <div className="font-mono text-sm font-medium text-foreground tracking-tight">
                                            {formatPrice(price)}
                                        </div>
                                    </div>

                                    {/* APR */}
                                    <div className={`text-right font-mono text-xs font-medium ${fundingPositive ? "text-emerald-500" : "text-rose-500"}`}>
                                        {formatNumber(perp.projections?.apr)}
                                    </div>

                                    {/* 24h Vol */}
                                    <div className="text-right font-mono text-xs text-muted-foreground">
                                        {formatBigNumber(perp.metadata?.volume24h)}
                                    </div>

                                    {/* OI */}
                                    <div className="text-right font-mono text-xs text-muted-foreground">
                                        {formatBigNumber(perp.metadata?.openInterest)}
                                    </div>

                                    {/* Protocol Badge */}
                                    <div className="text-right">
                                        <span className={`
                                            inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                                            ${perp.protocol === 'drift'
                                                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            }
                                        `}>
                                            {perp.protocol}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                        <Search className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-sm font-medium text-foreground">No markets found</h3>
                        <p className="text-xs text-muted-foreground mt-1">Try "{search}" on a different protocol</p>
                    </div>
                )}
            </div>

            {/* --- Live Footer --- */}
            <div className="px-6 py-3 bg-secondary/30 border-t border-border flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-background border border-border shadow-xs">
                        <span className={`relative flex h-2 w-2`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? "bg-emerald-500" : "bg-destructive"}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-emerald-500" : "bg-destructive"}`}></span>
                        </span>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                            {isConnected ? "Live Feed" : "Connecting..."}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/60">
                        {filteredPerps.length} Markets Loaded
                    </span>
                </div>
                <div className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em]">
                    Oryxen Aggregator
                </div>
            </div>
        </div>
    );
};

export default TradingHeaderDialog;