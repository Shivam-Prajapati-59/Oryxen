export interface NavItem {
    label: string;
    href: string;
    badge?: "beta" | "new";
}

export const navbarConfig = {
    logo: {
        src: "/oryx2.webp",
        alt: "logo",
        width: 32,
        height: 32,
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
