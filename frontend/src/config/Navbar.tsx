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
            label: "Liquidation",
            href: "/liquidation",
        },
        {
            label: "Funding Rate",
            href: "/funding-rate",
        },
        {
            label: "Leaderboard",
            href: "/leaderboard",
        },
    ] satisfies NavItem[],
};
