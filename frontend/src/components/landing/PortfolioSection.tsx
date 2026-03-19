"use client";

import { useEffect, useRef } from "react";

const protocols = [
  {
    title: "Jupiter Perps",
    type: "Oracle-based",
    category: "Perpetuals",
  },
  {
    title: "Drift Protocol",
    type: "vAMM + DLOB",
    category: "Perpetuals",
  },
];

const tiers = [
  {
    title: "Casual Trader",
    price: "Free",
    features: [
      "Smart order routing",
      "Up to 5x leverage",
      "Basic analytics dashboard",
    ],
    timeline: "Start instantly",
  },
  {
    title: "Pro Trader",
    price: "$0 Fees*",
    features: [
      "Priority order routing",
      "Up to 20x leverage",
      "Advanced analytics & alerts",
    ],
    timeline: "* Oryxen charges zero platform fees",
  },
  {
    title: "Institutional",
    price: "Custom",
    features: [
      "API access & webhooks",
      "Custom routing logic",
      "Dedicated support channel",
    ],
    timeline: "Contact us for details",
  },
];

export default function PortfolioSection() {
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
    <section id="protocols" className="portfolio-section" ref={sectionRef}>
      <div className="portfolio-container">
        <div className="section-badge center fade-up">
          <span className="badge-dot"></span>
          <span>Supported Protocols</span>
        </div>

        <h2 className="section-title-center fade-up">
          Connected To The Best
          <br />
          <span className="text-dim">Perpetual DEXs On Solana.</span>
        </h2>

        <p className="section-subtitle fade-up">
          We integrate with leading Solana perpetual protocols
          <br />
          to deliver the best trading experience.
        </p>

        <a href="/perps" className="btn-primary fade-up">Launch Trading</a>

        <div className="portfolio-grid fade-up">
          {protocols.map((protocol, index) => (
            <div key={index} className="portfolio-card">
              <div className="portfolio-card-image">
                <div className="placeholder-gradient portfolio-img"></div>
              </div>
              <div className="portfolio-card-info">
                <h3>{protocol.title}</h3>
                <div className="portfolio-meta">
                  <span>{protocol.type}</span>
                  <span className="dot">•</span>
                  <span>{protocol.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="services-grid fade-up">
          {tiers.map((tier, index) => (
            <div key={index} className="service-card">
              <div className="service-header">
                <h3 className="service-title">{tier.title}</h3>
                <span className="service-price">{tier.price}</span>
              </div>
              <div className="service-divider"></div>
              <ul className="service-features">
                {tier.features.map((feature, i) => (
                  <li key={i}>
                    <svg className="check-icon-sm" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#0055FE"/>
                      <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="service-timeline">{tier.timeline}</span>
              <a href="/perps" className="btn-primary service-btn">
                Get Started
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
