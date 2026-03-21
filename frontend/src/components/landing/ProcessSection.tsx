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
    <section className="py-[120px] px-10 relative max-md:py-20 max-md:px-5" ref={sectionRef}>
      <div className="max-w-[1200px] mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white w-fit fade-up">
          <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
          <span>How It Works</span>
        </div>

        <h2 className="text-[clamp(36px,5vw,56px)] font-medium leading-[1.15] mt-5 tracking-[-0.02em] max-sm:text-[32px] fade-up">
          Three Steps To Better
          <br />
          <span className="text-[#666]">Perpetual Trading.</span>
        </h2>

        <p className="text-base text-[#888] mt-4 leading-[1.7] mb-12 fade-up">
          Trade smarter with aggregated liquidity. No complexity,
          <br />
          just the best prices across Solana.
        </p>

        <div className="flex flex-col gap-6">
          {stages.map((stage, index) => (
            <div
              key={index}
              className="p-10 max-md:p-6 rounded-[20px] border border-[#1a1a1a] bg-[linear-gradient(135deg,rgba(0,85,254,0.03)_0%,#0a0a0a_50%,rgba(0,85,254,0.05)_100%)] relative overflow-hidden transition-colors duration-300 hover:border-[rgba(0,85,254,0.3)] after:content-[''] after:absolute after:top-0 after:right-0 after:w-[300px] after:h-[300px] after:bg-[radial-gradient(circle_at_top_right,rgba(0,85,254,0.05)_0%,transparent_60%)] after:pointer-events-none fade-up"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/5 border border-[#1a1a1a] rounded-xl flex items-center justify-center text-xl">
                  {stage.icon}
                </div>
                <span className="px-4 py-1.5 bg-white/5 border border-[#1a1a1a] rounded-full text-[13px] text-[#888]">
                  Step {stage.number}
                </span>
              </div>
              <h3 className="text-[22px] font-semibold mb-2">{stage.title}</h3>
              <div className="w-[60px] h-0.5 bg-[#0055FE] my-3"></div>
              <p className="text-[15px] text-[#888] leading-[1.7] max-w-[600px] mb-5">
                {stage.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {stage.tags.map((tag, i) => (
                  <span key={i} className="px-[18px] py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-[#888]">
                    {tag}
                  </span>
                ))}
              </div>
              {index === stages.length - 1 && (
                <a
                  href="/perps"
                  className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)] mt-2"
                >
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
