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
    <section className="py-[120px] px-10 relative max-md:py-20 max-md:px-5" ref={sectionRef}>
      <div className="max-w-[1200px] mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white w-fit fade-up">
          <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
          <span>Why Oryxen</span>
        </div>

        <h2 className="text-[clamp(36px,5vw,56px)] font-medium leading-[1.15] mt-5 tracking-[-0.02em] mb-9 max-sm:text-[32px] fade-up">
          Not Just Another DEX.
          <br />
          <span className="text-[#666]">The Aggregator You Deserve.</span>
        </h2>

        <div className="flex flex-wrap gap-2.5 mb-[60px] fade-up">
          {benefits.map((benefit, index) => (
            <span
              key={index}
              className="px-[22px] py-2.5 bg-white/[0.03] border border-[#1a1a1a] rounded-full text-sm text-[#888] cursor-default transition-all duration-300 no-underline hover:border-[#333] hover:text-white"
            >
              {benefit}
            </span>
          ))}
          <a
            href="/perps"
            className="px-[22px] py-2.5 bg-white/[0.08] border border-[#1a1a1a] rounded-full text-sm text-white cursor-pointer transition-all duration-300 no-underline hover:border-[#333]"
          >
            Trade Now →
          </a>
        </div>

        <div className="flex flex-col gap-5 fade-up">
          {/* Large Card */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[20px] overflow-hidden transition-all duration-300 hover:border-[rgba(0,85,254,0.2)]">
            <div className="h-[300px] overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[50%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] flex items-center justify-center">
                <div className="bg-[rgba(0,85,254,0.8)] px-6 py-3 rounded-xl text-[28px] font-bold text-white flex items-center gap-2">
                  <span>🦎 Oryxen</span>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 px-8 pt-6">Trade Any Perp Market On Solana</h3>
            <p className="text-sm text-[#888] leading-relaxed mb-5 px-8">
              Access every perpetual market across Jupiter, Drift, and Flash from a single interface.
              Oryxen finds the best venue for each trade automatically.
            </p>
            <div className="flex gap-3 px-8 pb-8">
              <a
                href="/perps"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)]"
              >
                Start Trading
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-white/5 text-white border border-[#1a1a1a] rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-white/10 hover:border-[#333] hover:-translate-y-0.5"
              >
                View Features
              </a>
            </div>
          </div>

          {/* Small Cards Row */}
          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5">
            {/* Daily Volume Card */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[20px] overflow-hidden transition-all duration-300 hover:border-[rgba(0,85,254,0.2)]">
              <div className="h-[140px] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[50%] to-[#0a0a0a] flex items-center justify-center border-b border-[#1a1a1a]">
                <span className="text-5xl font-bold text-white/15 tracking-[-2px]">$50M+</span>
              </div>
              <div className="flex items-center gap-2.5 px-6 pt-5">
                <h3 className="text-xl font-semibold mb-3">Daily Volume</h3>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white tracking-[0.5px] bg-[#0055FE]">
                  LIVE
                </span>
              </div>
              <p className="text-sm text-[#888] leading-relaxed px-6 pb-6">Aggregated volume across all connected protocols.</p>
            </div>

            {/* Markets Card */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[20px] overflow-hidden transition-all duration-300 hover:border-[rgba(0,85,254,0.2)]">
              <div className="h-[140px] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[50%] to-[#0a0a0a] flex items-center justify-center border-b border-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-sm">◎</span>
                  <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-sm">₿</span>
                  <span className="text-sm text-[#888] px-3.5 py-1.5 bg-white/5 rounded-md">SOL/BTC</span>
                  <span className="text-sm text-white px-3.5 py-1.5 bg-[#0055FE] rounded-md font-semibold">Trade</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-6 pt-5">
                <h3 className="text-xl font-semibold mb-3">50+ Markets</h3>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white tracking-[0.5px] bg-[#22C55E]">
                  GROWING
                </span>
              </div>
              <p className="text-sm text-[#888] leading-relaxed px-6 pb-6">Trade SOL, BTC, ETH, and many more perp markets.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
