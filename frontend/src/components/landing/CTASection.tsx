"use client";

import { useEffect, useRef } from "react";

export default function CTASection() {
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
    <section className="cta-section" ref={sectionRef}>
      <div className="cta-container">
        <div className="section-badge center fade-up">
          <span className="badge-dot"></span>
          <span>Get Started</span>
        </div>

        <h2 className="section-title-center fade-up">
          The Smartest Way To Trade
          <br />
          <span className="text-dim">Perpetuals On Solana</span>
        </h2>

        <p className="section-subtitle fade-up">
          Connect your wallet and start trading with aggregated
          <br />
          liquidity across the best Solana DEXs.
        </p>

        <a href="/perps" className="btn-primary fade-up">Launch App</a>

        <div className="cta-images fade-up">
          <div className="cta-image-row">
            <div className="cta-image-card">
              <div className="placeholder-gradient cta-img-1"></div>
            </div>
            <div className="cta-image-card">
              <div className="placeholder-gradient cta-img-2"></div>
            </div>
          </div>
          <div className="cta-image-row three-col">
            <div className="cta-image-card small">
              <div className="placeholder-gradient cta-img-3"></div>
            </div>
            <div className="cta-image-card small">
              <div className="placeholder-gradient cta-img-4"></div>
            </div>
            <div className="cta-image-card small">
              <div className="placeholder-gradient cta-img-5"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
