"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export default function HeroSection() {
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
    <section id="hero" className="hero-section" ref={sectionRef}>
      {/* Hero Beat Gradient Blobs */}
      <div className="hero-beat-blob blob-top-right"></div>
      <div className="hero-beat-blob blob-bottom-left"></div>
      <div className="hero-beat-blob blob-center"></div>

      <div className="hero-container">
        <div className="hero-badge fade-up">
          <span className="badge-new">LIVE</span>
          <span className="badge-text">Solana&apos;s #1 Perp Aggregator</span>
        </div>

        <h1 className="hero-title fade-up">
          Trade Perpetuals.
          <br />
          Best Price. Always.
        </h1>

        <p className="hero-subtitle fade-up">
          Oryxen aggregates liquidity across Solana&apos;s top perpetual
          <br />
          DEXs to find you the best execution price, every time.
        </p>

        <div className="hero-buttons fade-up">
          <a href="/perps" className="btn-primary">Start Trading</a>
          <a href="#about" className="btn-secondary">How It Works</a>
        </div>

        <div className="hero-divider fade-up"></div>

        <div className="hero-logos fade-up">
          <span className="logo-text" style={{ fontSize: "12px", color: "#444", marginRight: "8px" }}>AGGREGATING</span>
          <Image src="/assets/protocols/jupiter.webp" alt="Jupiter" width={28} height={28} style={{ borderRadius: "50%", opacity: 0.6 }} />
          <Image src="/assets/protocols/drift.png" alt="Drift" width={28} height={28} style={{ borderRadius: "50%", opacity: 0.6 }} />
          <Image src="/assets/protocols/flash.jpg" alt="Flash" width={28} height={28} style={{ borderRadius: "50%", opacity: 0.6 }} />
          <Image src="/assets/protocols/hyperliquid.webp" alt="Hyperliquid" width={28} height={28} style={{ borderRadius: "50%", opacity: 0.6 }} />
        </div>
      </div>
    </section>
  );
}
