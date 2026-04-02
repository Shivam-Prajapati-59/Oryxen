import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Dispatch, SetStateAction } from "react";

interface LeverageSliderProps {
    leverage: number;
    setLeverage: Dispatch<SetStateAction<number>>;
}

export function LeverageSlider({ leverage, setLeverage }: LeverageSliderProps) {
    return (
        <div className="space-y-4 pt-1">
            <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
                    Leverage
                </span>
                <div className="flex items-center">
                    <span className="text-base font-ibm font-medium text-foreground mr-1">{leverage}x</span>
                </div>
            </div>

            <div className="px-2">
                <Slider
                    value={[leverage]}
                    onValueChange={(value) => setLeverage(value[0])}
                    min={2}
                    max={20}
                    step={1}
                    className="w-full cursor-pointer"
                />
            </div>

            <div className="flex justify-between text-[11px] text-muted-foreground px-2 font-medium">
                <span>2x</span>
                <span>5x</span>
                <span>10x</span>
                <span>15x</span>
                <span>20x</span>
            </div>
        </div>
    );
}