import { Input } from "@/components/ui/input";
import { Dispatch, SetStateAction } from "react";

interface OrderSizeInputProps {
    tradeAmount: string;
    setTradeAmount: Dispatch<SetStateAction<string>>;
}

export function OrderSizeInput({
    tradeAmount,
    setTradeAmount,
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

                <div className="h-10 w-28 shrink-0 flex items-center justify-center gap-2 border rounded-md px-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/sol.svg" alt="" width={24} height={24} className="rounded-full" />
                    <span className="text-md font-medium">SOL</span>
                </div>
            </div>
        </div>
    );
}
