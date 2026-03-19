"use client";

import { useEffect, useRef } from "react";

const stages = [
  {
    number: 1,
    title: "Connect Wallet",
    icon: "🔗",
    description:
      "Connect your Solana wallet (Phantom, Backpack, or any supported wallet) to get started. No sign-ups, no KYC — just pure on-chain trading.",
    tags: ["Phantom", "Backpack", "Solflare"],
  },
  {
    number: 2,
    title: "Choose Your Trade",
    icon: "📊",
    description:
      "Select your trading pair, set your leverage (up to 20x), and choose your position size. Oryxen instantly scans all connected DEXs for the best price.",
    tags: ["Smart Order Routing", "Best Price Discovery"],
  },
  {
    number: 3,
    title: "Execute & Earn",
    icon: "⚡",
    description:
      "Your trade is routed to the protocol offering the best execution. Monitor PnL in real-time, manage positions, and close with one click.",
    tags: ["Real-time PnL", "One-click Close"],
  },
];

export default function ProcessSection() {
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
    <section className="process-section" ref={sectionRef}>
      <div className="process-container">
        <div className="section-badge fade-up">
          <span className="badge-dot"></span>
          <span>How It Works</span>
        </div>

        <h2 className="process-title fade-up">
          Three Steps To Better
          <br />
          <span className="text-dim">Perpetual Trading.</span>
        </h2>

        <p className="process-subtitle fade-up">
          Trade smarter with aggregated liquidity. No complexity,
          <br />
          just the best prices across Solana.
        </p>

        <div className="stages-container">
          {stages.map((stage, index) => (
            <div key={index} className="stage-card fade-up">
              <div className="stage-card-header">
                <div className="stage-icon">{stage.icon}</div>
                <span className="stage-number">Step {stage.number}</span>
              </div>
              <h3 className="stage-title">{stage.title}</h3>
              <div className="stage-divider"></div>
              <p className="stage-description">{stage.description}</p>
              <div className="stage-tags">
                {stage.tags.map((tag, i) => (
                  <span key={i} className="stage-tag">{tag}</span>
                ))}
              </div>
              {index === stages.length - 1 && (
                <a href="/perps" className="btn-primary stage-cta">
                  Start Trading Now
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
