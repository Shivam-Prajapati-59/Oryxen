"use client";

import { useEffect, useRef } from "react";

const testimonials = [
  {
    quote:
      "Oryxen completely changed how I trade perps. The smart routing saved me hundreds in slippage on large positions. It's the only aggregator I use now.",
    name: "DeFi Whale",
    role: "Solana Trader, @defi_whale",
    avatar: "🐋",
  },
  {
    quote:
      "Being able to compare funding rates across Jupiter, Drift, and Flash in one dashboard is insanely valuable. Found multiple arb opportunities in the first week.",
    name: "Alex Trader",
    role: "Professional Trader",
    avatar: "📊",
  },
  {
    quote:
      "The execution speed is unreal — sub-second fills on Solana. Non-custodial, no KYC, just connect wallet and trade. This is what DeFi should be.",
    name: "CryptoNativa",
    role: "DAO Contributor, @cryptonativa",
    avatar: "⚡",
  },
];

export default function TestimonialsSection() {
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
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white mx-auto fade-up">
          <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
          <span>Community</span>
        </div>

        <h2 className="text-center text-[clamp(36px,5vw,64px)] font-medium leading-[1.15] mt-6 tracking-[-0.02em] max-sm:text-[32px] fade-up">
          What Traders Say
          <br />
          <span className="text-[#666]">About Trading On Oryxen.</span>
        </h2>

        <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-5 mt-12 fade-up">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 max-sm:p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[20px] transition-all duration-300 hover:border-[rgba(0,85,254,0.3)] hover:-translate-y-[3px]"
            >
              <div className="text-[#FFD700] text-base tracking-[2px] mb-4">★★★★★</div>
              <p className="text-[15px] text-[#888] leading-[1.7] mb-6 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0055FE] to-[#6366F1] flex items-center justify-center text-sm font-semibold text-white">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">{testimonial.name}</p>
                  <p className="text-[13px] text-[#888]">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
