export interface NavItem {
    label: string;
    href: string;
    badge?: "beta" | "new";
}

export const navbarConfig = {
    logo: {
        src: "/globe.svg",
        alt: "logo",
        width: 25,
        height: 25,
    },

    navItems: [
        {
            label: "Perps",
            href: "/perps",
        },
        {
            label: "Spot",
            href: "/spot",
        },
        {
            label: "Liquidation",
            href: "/liquidation",
        },
        {
            label: "Funding Rate",
            href: "/funding-rate",
        },
        {
            label: "Points",
            href: "/points",
        },
        {
            label: "Leaderboard",
            href: "/leaderboard",
        },
    ] satisfies NavItem[],
};
