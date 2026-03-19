"use client";

import { useEffect, useRef } from "react";

const benefits = [
  "Best Price Routing",
  "Multi-DEX Aggregation",
  "Sub-second Execution",
  "Non-custodial",
  "Cross-margin",
  "Funding Rate Tracker",
  "Liquidation Alerts",
  "Position Management",
  "Open Source",
  "Community Driven",
];

export default function BenefitsSection() {
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
    <section className="benefits-section" ref={sectionRef}>
      <div className="benefits-container">
        <div className="section-badge fade-up">
          <span className="badge-dot"></span>
          <span>Why Oryxen</span>
        </div>

        <h2 className="benefits-title fade-up">
          Not Just Another DEX.
          <br />
          <span className="text-dim">The Aggregator You Deserve.</span>
        </h2>

        <div className="benefits-tags fade-up">
          {benefits.map((benefit, index) => (
            <span key={index} className="benefit-tag">{benefit}</span>
          ))}
          <a href="/perps" className="benefit-tag contact-tag">Trade Now →</a>
        </div>

        <div className="benefits-cards fade-up">
          <div className="benefit-card benefit-card-large">
            <div className="benefit-card-image">
              <div className="placeholder-gradient benefit-img">
                <div className="next-badge">
                  <span>🦎 Oryxen</span>
                </div>
              </div>
            </div>
            <h3 className="benefit-card-title">Trade Any Perp Market On Solana</h3>
            <p className="benefit-card-description">
              Access every perpetual market across Jupiter, Drift, and Flash from a single interface.
              Oryxen finds the best venue for each trade automatically.
            </p>
            <div className="benefit-card-buttons">
              <a href="/perps" className="btn-primary">Start Trading</a>
              <a href="#features" className="btn-secondary">View Features</a>
            </div>
          </div>

          <div className="benefit-cards-row">
            <div className="benefit-card benefit-card-small">
              <div className="benefit-small-image">
                <span className="big-number">$50M+</span>
              </div>
              <div className="benefit-card-title-row">
                <h3 className="benefit-card-title">Daily Volume</h3>
                <span className="feature-badge" style={{ backgroundColor: "#0055FE" }}>LIVE</span>
              </div>
              <p className="benefit-card-description">Aggregated volume across all connected protocols.</p>
            </div>

            <div className="benefit-card benefit-card-small">
              <div className="benefit-small-image">
                <div className="publish-icons">
                  <span className="publish-icon">◎</span>
                  <span className="publish-icon">₿</span>
                  <span className="publish-label">SOL/BTC</span>
                  <span className="publish-btn">Trade</span>
                </div>
              </div>
              <div className="benefit-card-title-row">
                <h3 className="benefit-card-title">50+ Markets</h3>
                <span className="feature-badge" style={{ backgroundColor: "#22C55E" }}>GROWING</span>
              </div>
              <p className="benefit-card-description">Trade SOL, BTC, ETH, and many more perp markets.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
