"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export default function AboutSection() {
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
    <section id="about" className="about-section" ref={sectionRef}>
      <div className="about-container">
        <div className="about-content">
          <div className="section-badge fade-up">
            <span className="badge-dot"></span>
            <span>About Oryxen</span>
          </div>

          <h2 className="about-title fade-up">
            Smarter Perpetual Trading
            <br />
            <span className="text-dim">Across All Solana DEXs.</span>
          </h2>

          <p className="about-description fade-up">
            Oryxen is a perpetual trading aggregator built on Solana.
            <br />
            We route your trades through the best DEXs for optimal pricing, lowest slippage, and deepest liquidity.
          </p>

          <div className="about-divider fade-up"></div>

          <div className="about-stats fade-up">
            <div className="stat-item">
              <svg className="check-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#0055FE"/>
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Aggregating $50M+ daily trading volume.</span>
            </div>
            <div className="stat-item">
              <svg className="check-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#0055FE"/>
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Up to 30% better pricing vs single-venue trades.</span>
            </div>
          </div>

          <div className="about-actions fade-up">
            <a href="/perps" className="btn-primary">Launch App</a>
            <div className="rating-block">
              <div className="stars">★★★★★</div>
              <span className="rating-text">Trusted by 5,000+ Traders</span>
            </div>
          </div>
        </div>

        <div className="about-image fade-up">
          <div className="image-placeholder about-img">
            <div className="placeholder-gradient"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
