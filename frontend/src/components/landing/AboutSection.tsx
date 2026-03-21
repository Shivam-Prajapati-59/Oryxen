"use client";

import { useEffect, useRef } from "react";

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
    <section id="about" className="py-[120px] px-10 relative max-md:py-20 max-md:px-5" ref={sectionRef}>
      <div className="max-w-[1200px] mx-auto">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white w-fit fade-up">
            <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
            <span>About Oryxen</span>
          </div>

          <h2 className="text-[clamp(36px,5vw,56px)] font-medium leading-[1.15] mt-5 tracking-[-0.02em] max-sm:text-[32px] fade-up">
            Smarter Perpetual Trading
            <br />
            <span className="text-[#666]">Across All Solana DEXs.</span>
          </h2>

          <p className="text-base text-[#888] mt-6 leading-[1.7] fade-up">
            Oryxen is a perpetual trading aggregator built on Solana.
            <br />
            We route your trades through the best DEXs for optimal pricing, lowest slippage, and deepest liquidity.
          </p>

          <div className="w-[200px] h-0.5 bg-gradient-to-r from-[#0055FE] to-transparent my-8 fade-up"></div>

          <div className="flex flex-col gap-4 mb-8 fade-up">
            <div className="flex items-center gap-3 text-base text-[#888]">
              <svg className="shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#0055FE"/>
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Aggregating $50M+ daily trading volume.</span>
            </div>
            <div className="flex items-center gap-3 text-base text-[#888]">
              <svg className="shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#0055FE"/>
                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Up to 30% better pricing vs single-venue trades.</span>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-12 max-md:flex-col max-md:items-start fade-up">
            <a
              href="/perps"
              className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)]"
            >
              Launch App
            </a>
            <div className="flex flex-col gap-1">
              <div className="text-[#FFD700] text-lg tracking-[2px]">★★★★★</div>
              <span className="text-sm text-[#888]">Trusted by 5,000+ Traders</span>
            </div>
          </div>
        </div>

        <div className="mt-12 fade-up">
          <div className="w-full rounded-[20px] overflow-hidden relative h-[400px] border border-[#1a1a1a]">
            <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px] border border-[#1a1a1a]"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
