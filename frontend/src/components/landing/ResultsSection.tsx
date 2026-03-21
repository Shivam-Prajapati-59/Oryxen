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
    <section className="py-[120px] px-10 relative max-md:py-20 max-md:px-5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[400px] before:bg-[radial-gradient(ellipse_at_center,rgba(0,85,254,0.15)_0%,transparent_70%)] before:pointer-events-none" ref={sectionRef}>
      <div className="text-center mb-[60px] relative z-1 fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white mx-auto mb-5">
          <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
          <span>Supported Protocols</span>
        </div>
        <h2 className="text-center text-[clamp(36px,5vw,64px)] font-medium leading-[1.15] mt-6 tracking-[-0.02em] max-sm:text-[32px]">
          Aggregated Liquidity
          <br />
          <span className="text-[#666]">From The Best Solana DEXs</span>
        </h2>
        <p className="text-center text-base text-[#888] mt-4 leading-[1.7]">
          Oryxen connects to multiple perpetual exchanges to find
          <br />
          the optimal route for every trade you make.
        </p>
        <a
          href="/perps"
          className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)] mt-6"
        >
          Start Trading
        </a>
      </div>

      <div className="flex gap-6 overflow-x-auto py-5 snap-x snap-mandatory max-w-[1200px] mx-auto [&::-webkit-scrollbar]:hidden max-md:px-2.5 fade-up">
        {resultsData.map((item, index) => (
          <div
            key={index}
            className="min-w-[350px] max-md:min-w-[300px] shrink-0 rounded-[20px] overflow-hidden border border-[#1a1a1a] bg-[#0a0a0a] snap-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,85,254,0.1)]"
          >
            <div className="h-[200px] overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite]"></div>
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-medium mb-1 flex items-center gap-2 before:content-['📍'] before:text-base">
                {item.city}
              </h3>
              <p className="text-base font-medium mb-3 text-white">{item.company}</p>
              <p className="text-sm text-[#888] mb-4 leading-relaxed">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                {item.stats.map((stat, i) => (
                  <span key={i} className="px-3.5 py-1.5 bg-white/5 border border-[#1a1a1a] rounded-full text-[13px] text-[#888]">
                    {stat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
