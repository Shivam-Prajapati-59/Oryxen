"use client";

import { useTheme } from "next-themes";
import React, { useEffect, useRef } from "react";

let tvScriptLoadingPromise: Promise<void> | undefined;

interface TradingViewWidgetProps {
    symbol: string;
    resolution: string;
}

function getCurrentTimezoneName() {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
    symbol,
    resolution,
}) => {
    const { resolvedTheme } = useTheme();
    const onLoadScriptRef = useRef<(() => void) | null>(null);
    const widgetRef = useRef<any>(null);

    useEffect(() => {
        onLoadScriptRef.current = createWidget;

        if (!tvScriptLoadingPromise) {
            tvScriptLoadingPromise = new Promise((resolve) => {
                const script = document.createElement("script");
                script.id = "tradingview-widget-loading-script";
                script.src = "https://s3.tradingview.com/tv.js";
                script.type = "text/javascript";
                script.onload = () => resolve();

                document.head.appendChild(script);
            });
        }

        tvScriptLoadingPromise.then(
            () => onLoadScriptRef.current && onLoadScriptRef.current()
        );

        return () => {
            onLoadScriptRef.current = null;
        };

        function createWidget() {
            if (document.getElementById("tradingview") && "TradingView" in window) {
                // Remove the existing widget if it exists
                if (widgetRef.current) {
                    widgetRef.current.remove();
                    widgetRef.current = null;
                }

                widgetRef.current = new (window as any).TradingView.widget({
                    container_id: "tradingview",
                    autosize: true,
                    symbol: `PYTH:${symbol}`,
                    interval: resolution,
                    timezone: getCurrentTimezoneName(),
                    theme: resolvedTheme === "dark" ? "dark" : "light",
                    style: "1",
                    locale: "en",
                    toolbar_bg: "#f1f3f6",
                    enable_publishing: false,
                    allow_symbol_change: true,
                    drawings_access: { type: 'all', tools: [{ name: "Regression Trend" }] }, // Optional: specific tools
                    hide_side_toolbar: false,      // Shows the left drawing toolbar
                    withdateranges: true,          // Shows the bottom range selector (1D, 5D, 1M, etc.)

                });
            }
        }
    }, [symbol, resolution, resolvedTheme]);

    return <div id="tradingview" className="w-full h-full" />;
};

export default TradingViewWidget;