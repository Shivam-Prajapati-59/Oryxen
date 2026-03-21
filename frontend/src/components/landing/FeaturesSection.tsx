"use client";

import { useEffect, useRef } from "react";

const features = [
  {
    icon: "🔄",
    iconBg: "#0055FE",
    title: "Smart Order Routing",
    badge: "CORE",
    badgeColor: "#0055FE",
    subtitle: "Best Execution",
    description:
      "Automatically routes your trade to the DEX offering the best price, lowest fees, and deepest liquidity.",
  },
  {
    icon: "📊",
    iconBg: "#8B5CF6",
    title: "Real-time Analytics",
    badge: "NEW",
    badgeColor: "#22C55E",
    subtitle: "Live Dashboards",
    description:
      "Track funding rates, open interest, and liquidation levels across all protocols in one unified dashboard.",
  },
  {
    icon: "⚡",
    iconBg: "#EAB308",
    title: "Sub-second Execution",
    badge: "FAST",
    badgeColor: "#F97316",
    subtitle: "Solana Speed",
    description:
      "Leverage Solana's 400ms block times for near-instant trade execution and position management.",
  },
  {
    icon: "🛡️",
    iconBg: "#22C55E",
    title: "Non-custodial Trading",
    badge: "SECURE",
    badgeColor: "#22C55E",
    subtitle: "Your Keys, Your Coins",
    description:
      "Trade directly from your wallet. Oryxen never holds your funds — fully non-custodial and permissionless.",
  },
  {
    icon: "📈",
    iconBg: "#F97316",
    title: "Up To 20x Leverage",
    badge: "PRO",
    badgeColor: "#0055FE",
    subtitle: "Amplified Returns",
    description:
      "Open leveraged long and short positions on SOL, BTC, ETH and more with up to 20x leverage.",
  },
  {
    icon: "💰",
    iconBg: "#10B981",
    title: "Funding Rate Arbitrage",
    badge: "ALPHA",
    badgeColor: "#8B5CF6",
    subtitle: "Cross-venue Rates",
    description:
      "Compare funding rates across Jupiter, Drift, and Flash to find profitable arbitrage opportunities.",
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll(".fade-up");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      className="py-[120px] px-10 relative max-md:py-20 max-md:px-5 before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-[600px] before:bg-[radial-gradient(ellipse_at_center,rgba(0,85,254,0.15)_0%,transparent_70%)] before:pointer-events-none"
      ref={sectionRef}
    >
      <div className="max-w-[1200px] mx-auto relative z-1">
        <div className="mb-20 fade-up">
          <div className="w-full rounded-[20px] overflow-hidden relative h-[400px] border border-[#1a1a1a]">
            <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px] border border-[#1a1a1a]"></div>
          </div>
        </div>

        <div className="text-center mb-[60px] fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white mx-auto">
            <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
            <span>Platform Features</span>
          </div>

          <h2 className="text-center text-[clamp(36px,5vw,64px)] font-medium leading-[1.15] mt-6 tracking-[-0.02em] max-sm:text-[32px]">
            Everything You Need
            <br />
            <span className="text-[#666]">For Smarter Perp Trading.</span>
          </h2>

          <p className="text-center text-base text-[#888] mt-4 leading-[1.7]">
            A complete suite of tools designed for serious
            <br />
            perpetual traders on Solana.
          </p>

          <a
            href="/perps"
            className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)] mt-6"
          >
            Explore Features
          </a>
        </div>

        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-5 fade-up">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 max-sm:p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[20px] transition-all duration-300 hover:border-[rgba(0,85,254,0.3)] hover:-translate-y-[3px] group"
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: feature.iconBg }}
                >
                  {feature.icon}
                </div>
                <svg
                  className="opacity-40 transition-opacity duration-300 group-hover:opacity-100"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 12L12 4M12 4H6M12 4V10"
                    stroke="#555"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex items-center gap-2.5 mb-1">
                <h3 className="text-[17px] font-semibold">{feature.title}</h3>
                <span
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white tracking-[0.5px]"
                  style={{ backgroundColor: feature.badgeColor }}
                >
                  {feature.badge}
                </span>
              </div>
              <p className="text-sm text-[#888] mb-4">{feature.subtitle}</p>
              <div className="w-full h-px bg-[#1a1a1a] mb-4"></div>
              <p className="text-sm text-[#888] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
