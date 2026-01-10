/* -------------------------------------------------
   CONFIG & DATA
-------------------------------------------------- */
export const GROUPS = [
    {
        metric: "Funding Rate",
        key: "funding",
        protocols: [
            { key: "drift", label: "Drift" },
            { key: "hyperliquid", label: "Hyperliquid" },
        ],
    },
    {
        metric: "Borrow Rate",
        key: "borrow",
        protocols: [
            { key: "flash", label: "Flash" },
            { key: "jupiter", label: "Jupiter Perps" },
        ],
    },
];

export const MARKETS = ["BTC-PERP", "SOL-PERP"];

export const DATA: Record<string, Record<string, Record<string, string>>> = {
    "BTC-PERP": {
        funding: { drift: "0.019%", hyperliquid: "0.012%" },
        borrow: { flash: "3.6%", jupiter: "2.9%" },
    },
    "SOL-PERP": {
        funding: { drift: "0.014%", hyperliquid: "0.010%" },
        borrow: { flash: "3.2%", jupiter: "2.6%" },
    },
};
