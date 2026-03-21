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
    <section
      id="protocols"
      className="py-[120px] px-10 relative max-md:py-20 max-md:px-5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[400px] before:bg-[radial-gradient(ellipse_at_center,rgba(0,85,254,0.15)_0%,transparent_70%)] before:pointer-events-none"
      ref={sectionRef}
    >
      <div className="max-w-[1200px] mx-auto text-center relative z-1">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white mx-auto fade-up">
          <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
          <span>Supported Protocols</span>
        </div>

        <h2 className="text-center text-[clamp(36px,5vw,64px)] font-medium leading-[1.15] mt-6 tracking-[-0.02em] max-sm:text-[32px] fade-up">
          Connected To The Best
          <br />
          <span className="text-[#666]">Perpetual DEXs On Solana.</span>
        </h2>

        <p className="text-center text-base text-[#888] mt-4 leading-[1.7] fade-up">
          We integrate with leading Solana perpetual protocols
          <br />
          to deliver the best trading experience.
        </p>

        <a
          href="/perps"
          className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)] mt-6 mb-12 fade-up"
        >
          Launch Trading
        </a>

        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-6 mb-[60px] text-left fade-up">
          {protocols.map((protocol, index) => (
            <div
              key={index}
              className="rounded-[20px] overflow-hidden border border-[#1a1a1a] bg-[#0a0a0a] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,85,254,0.1)]"
            >
              <div className="h-[280px] overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite]"></div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{protocol.title}</h3>
                <div className="flex gap-2 items-center text-sm text-[#888]">
                  <span>{protocol.type}</span>
                  <span className="opacity-30">•</span>
                  <span>{protocol.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-5 text-left fade-up">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className="p-8 max-sm:p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[20px] flex flex-col transition-all duration-300 hover:border-[rgba(0,85,254,0.3)] hover:-translate-y-[3px]"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">{tier.title}</h3>
                <span className="text-xl font-bold text-[#0055FE]">{tier.price}</span>
              </div>
              <div className="w-full h-px bg-[#1a1a1a] mb-5"></div>
              <ul className="list-none flex flex-col gap-3 mb-5 grow">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-[#888]">
                    <svg className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#0055FE"/>
                      <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="text-[13px] text-[#666] mb-5">{tier.timeline}</span>
              <a
                href="/perps"
                className="w-full text-center inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)]"
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
