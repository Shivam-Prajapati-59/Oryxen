import * as React from "react"
import Image from "next/image"
import { ArrowUpRight, Coins } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"

interface PerpData {
    name: string
    protocol: string
    baseAsset: string
    imageUrl: string | null
}

interface OverViewCardProps {
    perps: PerpData[]
}

const OverViewCard = ({ perps }: OverViewCardProps) => {
    if (!perps || perps.length === 0) {
        return (
            <div className="w-full p-12 text-center border-2 border-dashed rounded-xl border-muted">
                <p className="text-muted-foreground">No perpetual markets found.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full p-6">
            {perps.map((perp, index) => {
                const isHyperliquid = perp.protocol?.toLowerCase().includes("hyperliquid");
                const safeSymbol = perp.baseAsset || "UNK";
                const displayName = perp.name || "Unknown Pair";

                return (
                    <Card
                        key={`${perp.protocol}-${perp.baseAsset}-${index}`}
                        className="group hover:ring-1 hover:ring-primary/40 transition-all duration-300 shadow-sm border-muted-foreground/10 bg-card/50 backdrop-blur-sm"
                    >
                        <CardHeader className="pb-3 pt-4 px-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-full bg-secondary/50 flex items-center justify-center border border-border">
                                        {perp.imageUrl ? (
                                            <Image
                                                src={perp.imageUrl}
                                                alt={safeSymbol}
                                                width={40}
                                                height={40}
                                                className="object-contain p-1.5"
                                            />
                                        ) : (
                                            <Coins className="w-5 h-5 text-muted-foreground/60" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-bold tracking-tight">
                                            {displayName}
                                        </CardTitle>
                                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                            {safeSymbol}
                                        </span>
                                    </div>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-[9px] font-bold px-1.5 py-0 rounded-sm uppercase tracking-tighter",
                                        isHyperliquid
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                    )}
                                >
                                    {isHyperliquid ? "HL" : "Drift"}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="px-4 pb-4">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-2 px-3 rounded-lg bg-secondary/30 border border-border/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Funding Rate</span>
                                    <span className="text-xs font-mono font-medium text-primary">
                                        --
                                    </span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Mark Price</span>
                                    <span className="text-xs font-mono font-medium">
                                        --
                                    </span>
                                </div>
                            </div>

                            <button className="w-full mt-3 group-hover:bg-primary group-hover:text-primary-foreground py-2 px-4 bg-secondary text-secondary-foreground text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-2">
                                Market Details
                                <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </button>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

export default OverViewCard;