import { PerpFundingRate } from "@/hooks/useFundingRates";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Search, XCircle, ArrowUp, ArrowDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    extractFundingRates,
    filterPerps,
    formatBigNumber,
    formatPrice,
    formatSignedRate,
    getSortIndicatorState,
    getVisibleSymbols,
    nextSortState,
    sortPerps,
    SortKey,
    SortState,
} from "./helpers/tradingHeaderDialog.helpers";

interface TradingHeaderDialogProps {
    onClose: () => void;
    onSelectMarket: (market: PerpFundingRate) => void;
    markets: PerpFundingRate[];
    isLoading: boolean;
    error?: boolean;
}

const ITEM_HEIGHT = 56;
const TABLE_COLS = "minmax(130px, 2fr) minmax(80px, 1.2fr) minmax(120px, 1.5fr) minmax(70px, 1fr) minmax(70px, 1fr)";

const Icon = ({ url, symbol }: { url?: string; symbol: string }) => {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const error = !url || failedUrl === url;

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
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt={symbol}
            className="w-full h-full rounded-full object-cover"
            onError={() => setFailedUrl(url)}
            loading="eager"
            decoding="async"
        />
    );
};

const TradingHeaderDialog = ({ onClose, onSelectMarket, markets: data, isLoading, error }: TradingHeaderDialogProps) => {
    const [search, setSearch] = useState("");
    const [protocolFilter, setProtocolFilter] = useState<"all" | "drift" | "gmxsol">("all");
    const [sortState, setSortState] = useState<SortState>({ sortKey: null, sortDirection: null });

    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const filteredPerps = useMemo(
        () => filterPerps(data, protocolFilter, search),
        [data, protocolFilter, search],
    );

    const sortedPerps = useMemo(
        () => sortPerps(filteredPerps, sortState),
        [filteredPerps, sortState],
    );

    const visibleSymbols = useMemo(
        () => getVisibleSymbols(sortedPerps, visibleRange),
        [sortedPerps, visibleRange],
    );

    const { prices } = usePriceFeed(visibleSymbols);

    const resetScrollPosition = () => {
        setVisibleRange({ start: 0, end: 20 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };

    const handleSort = (key: SortKey) => {
        resetScrollPosition();
        setSortState((prev) => nextSortState(prev, key));
    };

    const sortArrow = (key: SortKey) => {
        const indicator = getSortIndicatorState(sortState, key);

        if (indicator === "neutral") {
            return (
                <span className="inline-flex items-center -space-x-1">
                    <ArrowUp className="w-3 h-3 opacity-35" />
                    <ArrowDown className="w-3 h-3 opacity-35" />
                </span>
            );
        }

        return indicator === "asc" ? (
            <span className="inline-flex items-center -space-x-1">
                <ArrowUp className="w-3 h-3 text-foreground" />
                <ArrowDown className="w-3 h-3 opacity-20" />
            </span>
        ) : (
            <span className="inline-flex items-center -space-x-1">
                <ArrowUp className="w-3 h-3 opacity-20" />
                <ArrowDown className="w-3 h-3 text-foreground" />
            </span>
        );
    };

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

    const renderRateWithArrow = (rate: number | undefined) => {
        if (rate === undefined || Number.isNaN(rate)) {
            return <span className="text-muted-foreground">-</span>;
        }

        const isPositive = rate >= 0;
        const colorClass = isPositive ? "text-emerald-500" : "text-rose-500";

        return (
            <span className={`inline-flex items-center gap-1 ${colorClass}`}>
                <span>{formatSignedRate(rate)}</span>
            </span>
        );
    };

    const getFundingRateDisplay = (perp: PerpFundingRate) => {
        const { longRate, shortRate } = extractFundingRates(perp);

        if (longRate === undefined && shortRate === undefined) {
            return <span className="text-muted-foreground">-</span>;
        }

        return (
            <span className="inline-flex items-center justify-end gap-2">
                {renderRateWithArrow(longRate)}
                <span className="text-muted-foreground">/</span>
                {renderRateWithArrow(shortRate)}
            </span>
        );
    };

    const headerButtonClass = "inline-flex items-center justify-end gap-1 hover:text-foreground transition-colors";

    if (isLoading) return (
        <div className="flex h-96 w-full items-center justify-center bg-background rounded-xl">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Loading markets…</span>
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
            <div className="flex items-center gap-3 px-6 py-3 bg-background border-b border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                        autoFocus
                        type="text"
                        placeholder="Search markets..."
                        value={search}
                        onChange={(e) => {
                            resetScrollPosition();
                            setSearch(e.target.value);
                        }}
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

                <Select
                    value={protocolFilter}
                    onValueChange={(value: "all" | "drift" | "gmxsol") => {
                        resetScrollPosition();
                        setProtocolFilter(value);
                    }}
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

            <div className="grid gap-2 px-6 py-2 bg-muted/30 border-b border-border text-[15px] font-bold text-muted-foreground select-none font-mono"
                style={{ gridTemplateColumns: TABLE_COLS }}>
                <button onClick={() => handleSort("asset")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-left">
                    Market {sortArrow("asset")}
                </button>
                <button onClick={() => handleSort("price")} className={headerButtonClass}>
                    Price {sortArrow("price")}
                </button>
                <button onClick={() => handleSort("funding")} className={headerButtonClass}>
                    Funding Rate {sortArrow("funding")}
                </button>
                <button onClick={() => handleSort("volume24h")} className={headerButtonClass}>
                    24h Vol {sortArrow("volume24h")}
                </button>
                <button onClick={() => handleSort("openInterest")} className={headerButtonClass}>
                    OI {sortArrow("openInterest")}
                </button>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-background relative"
            >
                {sortedPerps.length > 0 ? (
                    <div className="relative w-full" style={{ height: `${sortedPerps.length * ITEM_HEIGHT}px` }}>
                        {sortedPerps.slice(visibleRange.start, visibleRange.end).map((perp, idx) => {
                            const absoluteIndex = visibleRange.start + idx;
                            const baseSymbol = perp.symbol.replace(/-PERP$/i, "");
                            const price = prices[baseSymbol] ?? perp.price;
                            const fundingRateDisplay = getFundingRateDisplay(perp);

                            return (
                                <div
                                    key={`${perp.protocol}-${perp.symbol}-${absoluteIndex}`}
                                    onClick={() => {
                                        onSelectMarket(perp);
                                        onClose();
                                    }}
                                    className="absolute left-0 right-0 grid gap-3 items-center px-6 border-b border-border/40 hover:bg-secondary/60 cursor-pointer transition-all group"
                                    style={{
                                        gridTemplateColumns: TABLE_COLS,
                                        top: `${absoluteIndex * ITEM_HEIGHT}px`,
                                        height: `${ITEM_HEIGHT}px`
                                    }}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden">
                                            <Icon url={perp.imageUrl} symbol={perp.symbol} />
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
                                    {/* Price column */}
                                    <div className="text-right truncate">
                                        <div className="font-mono text-sm font-medium text-foreground tracking-tight">
                                            {formatPrice(price)}
                                        </div>
                                    </div>
                                    {/* Funding rate column — whitespace-nowrap ensures L/S never wraps or clips */}
                                    <div className="text-right font-mono text-sm font-medium truncate text-foreground">
                                        {fundingRateDisplay}
                                    </div>
                                    <div className="text-right font-mono text-sm text-muted-foreground truncate">
                                        {formatBigNumber(perp.metadata?.volume24h)}
                                    </div>
                                    <div className="text-right font-mono text-sm text-muted-foreground truncate">
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
                        <p className="text-xs text-muted-foreground mt-1">Try &quot;{search}&quot; on a different protocol</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradingHeaderDialog;
