import { Input } from "@/components/ui/input";
import { Dispatch, SetStateAction } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface OrderSizeInputProps {
    tradeAmount: string;
    setTradeAmount: Dispatch<SetStateAction<string>>;
    selectedToken: string;
    setSelectedToken: Dispatch<SetStateAction<string>>;
}

export function OrderSizeInput({
    tradeAmount,
    setTradeAmount,
    selectedToken,
    setSelectedToken
}: OrderSizeInputProps) {
    return (
        <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Size</span>
            <div className="flex items-center gap-2 py-1">
                <Input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-9 w-full bg-transparent text-lg font-medium border dark:border-white/10 border-black/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger className="h-10 w-28 shrink-0 ">
                        <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="SOL">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg" alt="" width={20} height={20} className="rounded-full" />
                            SOL</SelectItem>
                        <SelectItem value="USDC">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/usdc.svg" alt="" width={20} height={20} className="rounded-full" />
                            USDC</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
