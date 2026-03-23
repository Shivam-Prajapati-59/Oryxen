import { PerpFundingRate } from "@/hooks/useFundingRates";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Search, Activity, XCircle, TrendingUp } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TradingHeaderDialogProps {
    onClose: () => void;
    onSelectMarket: (market: PerpFundingRate) => void;
    markets: PerpFundingRate[];
    isLoading: boolean;
    error?: boolean;
}

const ITEM_HEIGHT = 56;
const TABLE_COLS = "minmax(130px, 2fr) minmax(80px, 1.2fr) minmax(70px, 1fr) minmax(80px, 1fr) minmax(70px, 1fr) minmax(70px, 1fr)";

const AssetIcon = ({ url, symbol }: { url?: string; symbol: string }) => {
    const [error, setError] = useState(false);

    useEffect(() => { setError(false); }, [url]);

    if (!url || error) {
        const firstLetter = symbol.charAt(0).toUpperCase();
        return (
            <div className="w-full h-full rounded-full bg-linear-to-br from-sidebar-border to-sidebar-accent flex items-center justify-center border border-border/50 shadow-sm">
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
    const [protocolFilter, setProtocolFilter] = useState<"all" | "drift" | "gmxsol">("all");

    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const filteredPerps = useMemo(() => {
        if (!data) return [];

        const byProtocol = protocolFilter === "all"
            ? data
            : data.filter((perp) => perp.protocol.toLowerCase() === protocolFilter);

        return byProtocol.filter(
            (perp) =>
                perp.symbol.toLowerCase().includes(search.toLowerCase()) ||
                perp.protocol.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search, protocolFilter]);

    const visibleSymbols = useMemo(() => {
        const buffer = 8;
        const start = Math.max(0, visibleRange.start - buffer);
        const end = Math.min(filteredPerps.length, visibleRange.end + buffer);

        return filteredPerps
            .slice(start, end)
            .map((perp) => perp.symbol.replace(/-PERP$/i, ""))
            .filter((symbol, index, self) => self.indexOf(symbol) === index);
    }, [filteredPerps, visibleRange]);

    const { prices, isConnected } = usePriceFeed(visibleSymbols);

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

    useEffect(() => {
        setVisibleRange({ start: 0, end: 20 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [search, protocolFilter]);

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

            {/* --- Header Search Section: Increaced px-3 to px-6 --- */}
            <div className="flex items-center gap-3 px-6 py-3 bg-background border-b border-border">
                {/* Search input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                        autoFocus
                        type="text"
                        placeholder="Search markets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-8 h-10 bg-secondary/50 border-transparent focus-visible:border-ring/30 focus-visible:ring-1 focus-visible:ring-ring/10"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Protocol filter */}
                <Select
                    value={protocolFilter}
                    onValueChange={(value: "all" | "drift" | "gmxsol") => setProtocolFilter(value)}
                >
                    <SelectTrigger className="h-10 w-[120px] shrink-0 bg-secondary/50 border-transparent focus-visible:border-ring/30 text-sm">
                        <SelectValue placeholder="Protocol" />
                    </SelectTrigger>
                    <SelectContent side="bottom" position="popper" align="end">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="drift">Drift</SelectItem>
                        <SelectItem value="gmxsol">GMXSol</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* --- Table Headers: Increased px-4 to px-6 --- */}
            <div className="grid gap-2 px-6 py-2 bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none"
                style={{ gridTemplateColumns: TABLE_COLS }}>
                <span className="flex items-center gap-1">Asset</span>
                <span className="text-right">Price</span>
                <span className="text-right flex items-center justify-end gap-1">APR <TrendingUp className="w-3 h-3" /></span>
                <span className="text-right">7D APR</span>
                <span className="text-right">24h Vol</span>
                <span className="text-right">OI</span>
            </div>

            {/* --- Scrollable List --- */}
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
                            const sevenDayPositive = (perp.projections?.d7 || 0) > 0;

                            return (
                                <div
                                    key={`${perp.protocol}-${perp.symbol}-${absoluteIndex}`}
                                    onClick={() => {
                                        onSelectMarket(perp);
                                        onClose();
                                    }}
                                    // Increased px-4 to px-6 here as well
                                    className="absolute left-0 right-0 grid gap-2 items-center px-6 border-b border-border/40 hover:bg-secondary/60 cursor-pointer transition-all group"
                                    style={{
                                        gridTemplateColumns: TABLE_COLS,
                                        top: `${absoluteIndex * ITEM_HEIGHT}px`,
                                        height: `${ITEM_HEIGHT}px`
                                    }}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="relative w-6 h-6 shrink-0 rounded-full overflow-hidden">
                                            <AssetIcon url={perp.imageUrl} symbol={perp.symbol} />
                                        </div>
                                        <div className="flex flex-col leading-tight min-w-0">
                                            <span className="text-sm font-semibold text-secondary-foreground truncate">
                                                {baseSymbol}
                                            </span>
                                            <span className="text-xs text-zinc-400 truncate">
                                                Max {perp.maxleverage}x
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right truncate">
                                        <div className="font-mono text-sm font-medium text-foreground tracking-tight">
                                            {formatPrice(price)}
                                        </div>
                                    </div>
                                    <div className={`text-right font-mono text-xs font-medium truncate ${fundingPositive ? "text-emerald-500" : "text-rose-500"}`}>
                                        {formatNumber(perp.projections?.apr)}
                                    </div>
                                    <div className={`text-right font-mono text-xs font-medium truncate ${sevenDayPositive ? "text-emerald-500" : "text-rose-500"}`}>
                                        {formatNumber(perp.projections?.d7)}
                                    </div>
                                    <div className="text-right font-mono text-xs text-muted-foreground truncate">
                                        {formatBigNumber(perp.metadata?.volume24h)}
                                    </div>
                                    <div className="text-right font-mono text-xs text-muted-foreground truncate">
                                        {formatBigNumber(perp.metadata?.openInterest)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                        <Search className="w-10 h-10 text-muted-foreground mb-3 opacity-20" />
                        <h3 className="text-sm font-medium text-foreground">No markets found</h3>
                        <p className="text-xs text-muted-foreground mt-1">Try "{search}" on a different protocol</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradingHeaderDialog;