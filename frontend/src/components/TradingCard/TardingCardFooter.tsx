"use client";

import React from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

const TradingCardFooter = () => {
    return (
        <div className="w-full border overflow-hidden">
            <Tabs defaultValue="positions" className="w-full">
                {/* TAB HEADERS */}
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                    <TabsTrigger
                        value="positions"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        Positions (0)
                    </TabsTrigger>
                    <TabsTrigger
                        value="orders"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        Orders (0)
                    </TabsTrigger>
                    <TabsTrigger
                        value="balance"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        Balance
                    </TabsTrigger>
                    <TabsTrigger
                        value="tradeHistory"
                        className="rounded-none data-[state=active]:bg-accent"
                    >
                        History
                    </TabsTrigger>
                </TabsList>

                {/* TAB CONTENT */}
                <TabsContent value="positions" className="mt-0">
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        No open positions.
                    </div>
                </TabsContent>

                <TabsContent value="orders" className="mt-0">
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        No active orders.
                    </div>
                </TabsContent>

                <TabsContent value="balance" className="mt-0">
                    <div className="p-6 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Available Balance:</span>
                            <span className="text-foreground font-medium">0.00 USDC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Equity:</span>
                            <span className="text-foreground font-medium">0.00 USDC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Unrealized PnL:</span>
                            <span className="text-foreground font-medium">0.00 USDC</span>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="tradeHistory" className="mt-0">
                    <div className="p-6 text-center text-sm text-muted-foreground">
                        No trades executed yet.
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TradingCardFooter;