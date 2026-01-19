import { useAllPerps } from "@/hooks/useAllPerps";
import React, { useMemo, useState } from "react";

interface TradingHeaderDialogProps {
    onClose: () => void;
}

const TradingHeaderDialog = ({ onClose }: TradingHeaderDialogProps) => {
    const { data, isLoading, error } = useAllPerps();
    const [search, setSearch] = useState("");

    const filteredPerps = useMemo(() => {
        if (!data) return [];

        return data.filter(
            (perp) =>
                perp.symbol.toLowerCase().includes(search.toLowerCase()) ||
                perp.protocol.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

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

            {/* Symbols List */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col divide-y divide-white/10">
                    {filteredPerps.map((perp) => (
                        <div
                            key={`${perp.protocol}-${perp.symbol}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-accent cursor-pointer transition"
                            onClick={onClose}
                        >
                            <img
                                src={perp.imageUrl}
                                alt={perp.symbol}
                                width={32}
                                height={32}
                                className="rounded-full"
                            />

                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                    {perp.symbol}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {perp.protocol}
                                </span>
                            </div>

                            <div className="ml-auto text-xs text-muted-foreground">
                                {perp.maxleverage}×
                            </div>
                        </div>
                    ))}

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