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
    <section id="features" className="features-section" ref={sectionRef}>
      <div className="features-container">
        <div className="features-image fade-up">
          <div className="image-placeholder features-img">
            <div className="placeholder-gradient"></div>
          </div>
        </div>

        <div className="features-header fade-up">
          <div className="section-badge center">
            <span className="badge-dot"></span>
            <span>Platform Features</span>
          </div>

          <h2 className="section-title-center">
            Everything You Need
            <br />
            <span className="text-dim">For Smarter Perp Trading.</span>
          </h2>

          <p className="section-subtitle">
            A complete suite of tools designed for serious
            <br />
            perpetual traders on Solana.
          </p>

          <a href="/perps" className="btn-primary">Explore Features</a>
        </div>

        <div className="features-grid fade-up">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-card-top">
                <div
                  className="feature-icon"
                  style={{ backgroundColor: feature.iconBg }}
                >
                  {feature.icon}
                </div>
                <svg className="feature-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 12L12 4M12 4H6M12 4V10" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="feature-title-row">
                <h3 className="feature-title">{feature.title}</h3>
                <span
                  className="feature-badge"
                  style={{ backgroundColor: feature.badgeColor }}
                >
                  {feature.badge}
                </span>
              </div>
              <p className="feature-subtitle">{feature.subtitle}</p>
              <div className="feature-divider"></div>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
