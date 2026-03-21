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
    <section className="py-[120px] px-10 relative max-md:py-20 max-md:px-5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[300px] before:bg-[radial-gradient(ellipse_at_center,rgba(0,85,254,0.15)_0%,transparent_70%)] before:pointer-events-none" ref={sectionRef}>
      <div className="max-w-[1200px] mx-auto text-center relative z-1">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white mx-auto fade-up">
          <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
          <span>Get Started</span>
        </div>

        <h2 className="text-center text-[clamp(36px,5vw,64px)] font-medium leading-[1.15] mt-6 tracking-[-0.02em] max-sm:text-[32px] fade-up">
          The Smartest Way To Trade
          <br />
          <span className="text-[#666]">Perpetuals On Solana</span>
        </h2>

        <p className="text-center text-base text-[#888] mt-4 leading-[1.7] fade-up">
          Connect your wallet and start trading with aggregated
          <br />
          liquidity across the best Solana DEXs.
        </p>

        <a
          href="/perps"
          className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)] mt-6 mb-[60px] fade-up"
        >
          Launch App
        </a>

        <div className="flex flex-col gap-5 fade-up">
          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-5">
            <div className="rounded-[20px] overflow-hidden border border-[#1a1a1a] transition-transform duration-300 hover:-translate-y-1">
              <div className="w-full h-[300px] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px]"></div>
            </div>
            <div className="rounded-[20px] overflow-hidden border border-[#1a1a1a] transition-transform duration-300 hover:-translate-y-1">
              <div className="w-full h-[300px] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px]"></div>
            </div>
          </div>
          <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-5">
            <div className="rounded-[20px] overflow-hidden border border-[#1a1a1a] transition-transform duration-300 hover:-translate-y-1">
              <div className="w-full h-[200px] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px]"></div>
            </div>
            <div className="rounded-[20px] overflow-hidden border border-[#1a1a1a] transition-transform duration-300 hover:-translate-y-1">
              <div className="w-full h-[200px] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px]"></div>
            </div>
            <div className="rounded-[20px] overflow-hidden border border-[#1a1a1a] transition-transform duration-300 hover:-translate-y-1 max-lg:hidden max-md:block">
              <div className="w-full h-[200px] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px]"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
