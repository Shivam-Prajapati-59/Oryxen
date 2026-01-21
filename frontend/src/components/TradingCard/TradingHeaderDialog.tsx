import { useAllPerps } from "@/hooks/useAllPerps";
import React, { useMemo, useState } from "react";
import { BadgeCheck, Stone } from "lucide-react";
import Image from "next/image";

interface TradingHeaderDialogProps {
    onClose: () => void;
}

const TradingHeaderDialog = ({ onClose }: TradingHeaderDialogProps) => {
    const { data, isLoading, error } = useAllPerps();
    const [search, setSearch] = useState("");
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    const filteredPerps = useMemo(() => {
        if (!data) return [];

        return data.filter(
            (perp) =>
                perp.symbol.toLowerCase().includes(search.toLowerCase()) ||
                perp.protocol.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

    const handleImageError = (key: string) => {
        setFailedImages((prev) => new Set(prev).add(key));
    };

    if (isLoading) return <div className="p-4 bg-background border dark:border-white/10 border-black/20 h-full">Loading...</div>;
    if (error) return <div className="p-4 bg-background border dark:border-white/10 border-black/20 h-full">Error: {error.message}</div>;

    return (
        <div className="w-full h-full bg-background border dark:border-white/10 border-black/20 flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b border-white/10">
                <input
                    type="text"
                    placeholder="Search markets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20"
                />
            </div>

            {/* Table Headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 border-b border-white/10 bg-secondary/50">
                <div className="text-xs font-medium text-muted-foreground">
                    Symbol
                </div>
                <div className="text-xs font-medium text-muted-foreground text-right">
                    Current Price
                </div>
                <div className="text-xs font-medium text-muted-foreground text-right">
                    Change (24hr)
                </div>
            </div>

            {/* Symbols List */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col divide-y divide-white/10">
                    {filteredPerps.map((perp) => {
                        const key = `${perp.protocol}-${perp.symbol}`;
                        const imageHasFailed = failedImages.has(key);
                        const hasValidImageUrl = perp.imageUrl && perp.imageUrl.trim() !== '';
                        const shouldShowFallback = imageHasFailed || !hasValidImageUrl;

                        return (
                            <div
                                key={key}
                                className="grid grid-cols-[2fr_1fr_1fr] gap-4 items-center px-4 py-3 hover:bg-accent cursor-pointer transition"
                                onClick={onClose}
                            >
                                {/* Symbol Column */}
                                <div className="flex items-center gap-3">
                                    {shouldShowFallback ? (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                            <Stone className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <Image
                                            src={perp.imageUrl}
                                            alt={perp.symbol}
                                            width={32}
                                            height={32}
                                            className="rounded-full"
                                            onError={() => handleImageError(key)}
                                        />
                                    )}

                                    <div className="flex items-center space-x-1 md:space-x-2">
                                        <h2 className="text-sm md:text-md font-ibm font-medium tracking-wider">
                                            {perp.symbol}
                                        </h2>

                                        <BadgeCheck className="w-4 h-4 text-emerald-400" />

                                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                            {perp.maxleverage}x
                                        </span>
                                    </div>
                                </div>

                                {/* Current Price Column */}
                                <div className="text-sm font-medium text-foreground text-right">
                                    --
                                </div>

                                {/* Change (24hr) Column */}
                                <div className="text-sm font-medium text-muted-foreground text-right">
                                    --
                                </div>
                            </div>
                        );
                    })}

                    {filteredPerps.length === 0 && (
                        <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                            No results found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradingHeaderDialog;