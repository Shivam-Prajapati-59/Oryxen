"use client"
import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "../ui/separator";

export const highestFundingRates = [
    { id: "1", platform: "DRIFT", market: "CLOUD-PERP", rate: 0.0194 },
    { id: "2", platform: "DRIFT", market: "LIT-PERP", rate: 0.0125 },
    { id: "3", platform: "HYPERLIQUID", market: "MAVIA-PERP", rate: 0.011 },
    { id: "4", platform: "DRIFT", market: "ADA-PERP", rate: 0.0106 },
    { id: "5", platform: "HYPERLIQUID", market: "STBL-PERP", rate: 0.0081 },
];

export default function LowFundingRates() {
    const [timeFrame, setTimeFrame] = React.useState("current");

    return (
        <Card className="w-full dark:border-white/10 border-black/20">
            {/* Header Section */}
            <CardHeader>
                <div className="flex flex-row justify-between items-center">
                    <h2 className="text-xl font-bold tracking-tight text-red-500">
                        Lowest Funding Rate
                    </h2>

                    <Select value={timeFrame} onValueChange={setTimeFrame}>
                        <SelectTrigger className="w-32 h-9">
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="current">Current</SelectItem>
                            <SelectItem value="4h">4h</SelectItem>
                            <SelectItem value="12h">12h</SelectItem>
                            <SelectItem value="24h">24h</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <Separator />
            {/* Table Section */}
            <CardContent className="pt-0 px-2 xl:px-6">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="font-semibold">Platform</TableHead>
                            <TableHead className="font-semibold">Market</TableHead>
                            <TableHead className="text-right font-semibold">Rate</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {highestFundingRates.map((funding) => (
                            <TableRow
                                key={funding.id}
                                className="border-none hover:bg-transparent"
                            >
                                <TableCell className="font-medium">
                                    {funding.platform}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {funding.market}
                                </TableCell>
                                <TableCell className="text-red-500 font-medium text-right">
                                    {funding.rate}%
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            {/* TODO: Implement dynamic data fetching from Drift/Hyperliquid SDKs based on the selected timeFrame */}
            {/* TODO: Add sorting logic for the Rate column */}
        </Card>
    );
}