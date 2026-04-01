import { Slider } from "@/components/ui/slider";
import { Dispatch, SetStateAction } from "react";

interface LeverageSliderProps {
    leverage: number;
    setLeverage: Dispatch<SetStateAction<number>>;
}

export function LeverageSlider({ leverage, setLeverage }: LeverageSliderProps) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Leverage</span>
                <span className="text-base text-foreground font-medium">{leverage}x</span>
            </div>
            <Slider
                value={[((leverage - 2) * 100) / (100 - 2)]}
                onValueChange={(value) => {
                    const newLeverage = Math.round(2 + ((100 - 2) * value[0]) / 100);
                    setLeverage(newLeverage);
                }}
                max={100}
                step={1}
                className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>2x</span><span>10x</span><span>25x</span><span>50x</span><span>100x</span>
            </div>
        </div>
    );
}
