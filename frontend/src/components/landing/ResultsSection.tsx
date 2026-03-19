"use client";

import { useEffect, useRef } from "react";

const resultsData = [
  {
    city: "Jupiter",
    company: "Perp DEX",
    description: "Route through Jupiter for the best SOL-PERP rates with deep liquidity pools and tight spreads.",
    stats: ["$2B+ Monthly Volume", "50+ Markets"],
  },
  {
    city: "Drift Protocol",
    company: "Decentralized Exchange",
    description: "Access Drift's virtual AMM and orderbook for advanced perpetual strategies with cross-margin.",
    stats: ["Up to 20x Leverage", "Cross-Margin"],
  },
  {
    city: "Flash Trade",
    company: "On-chain Perps",
    description: "Leverage Flash's oracle-based pricing for near-zero slippage on large position sizes.",
    stats: ["Zero Price Impact", "Instant Settlement"],
  },
];

export default function ResultsSection() {
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
    <section className="results-section" ref={sectionRef}>
      <div className="results-header fade-up">
        <div className="section-badge">
          <span className="badge-dot"></span>
          <span>Supported Protocols</span>
        </div>
        <h2 className="section-title-center">
          Aggregated Liquidity
          <br />
          <span className="text-dim">From The Best Solana DEXs</span>
        </h2>
        <p className="section-subtitle">
          Oryxen connects to multiple perpetual exchanges to find
          <br />
          the optimal route for every trade you make.
        </p>
        <a href="/perps" className="btn-primary">Start Trading</a>
      </div>

      <div className="results-cards fade-up">
        {resultsData.map((item, index) => (
          <div key={index} className="result-card">
            <div className="result-card-image">
              <div className="placeholder-gradient result-img"></div>
            </div>
            <div className="result-card-content">
              <h3 className="result-city">{item.city}</h3>
              <p className="result-company">{item.company}</p>
              <p className="result-description">{item.description}</p>
              <div className="result-stats">
                {item.stats.map((stat, i) => (
                  <span key={i} className="stat-badge">{stat}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
