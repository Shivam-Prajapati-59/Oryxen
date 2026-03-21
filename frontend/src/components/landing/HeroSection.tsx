"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

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
    <section
      id="hero"
      className="min-h-screen flex items-center relative px-10 pt-[120px] pb-[60px] overflow-hidden max-md:px-5 max-md:pt-[100px]"
      ref={sectionRef}
    >
      {/* Hero Beat Gradient Blobs */}
      <div className="absolute rounded-full bg-[rgb(0,85,254)] blur-[320px] pointer-events-none z-0 will-change-transform animate-[heroBeat_10s_infinite_alternate_ease-in-out] w-[600px] h-[600px] -top-[150px] -right-[200px] opacity-35"></div>
      <div className="absolute rounded-full bg-[rgb(0,85,254)] blur-[320px] pointer-events-none z-0 will-change-transform animate-[heroBeat_10s_infinite_alternate_ease-in-out] w-[500px] h-[500px] -bottom-[100px] -left-[200px] opacity-25 [animation-delay:-5s]"></div>
      <div className="absolute rounded-full bg-[rgb(20,60,200)] blur-[320px] pointer-events-none z-0 will-change-transform animate-[heroBeat_10s_infinite_alternate_ease-in-out] w-[400px] h-[400px] top-[40%] left-[40%] opacity-15 [animation-delay:-3s]"></div>

      <div className="max-w-[1200px] mx-auto w-full relative z-1">
        <h1 className="text-[clamp(48px,7vw,86px)] font-normal leading-[1.05] tracking-[-0.03em] mb-6 max-w-[700px] max-md:text-[clamp(36px,10vw,56px)] max-sm:text-4xl fade-up">
          Trade Perpetuals.
          <br />
          Best Price. Always.
        </h1>

        <p className="text-base text-[#888] max-w-[500px] leading-[1.7] mb-9 fade-up">
          Oryxen aggregates liquidity across Solana&apos;s top perpetual
          <br />
          DEXs to find you the best execution price, every time.
        </p>

        <div className="flex gap-3 mb-[60px] max-md:flex-col max-md:gap-2.5 fade-up">
          <Link
            href="/perps"
            className="px-7 py-3.5 bg-[#0055FE] text-white rounded-lg text-[15px] font-medium transition-all duration-300 hover:bg-[#0044cc] hover:-translate-y-0.5"
          >
            Start Trading
          </Link>
          <Link
            href="#about"
            className="px-7 py-3.5 bg-[#FFFFFF26] text-white border border-white/10 rounded-md text-[15px] font-medium transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
          >
            How It Works
          </Link>
        </div>

        <div className="w-[400px] max-w-full h-px bg-linear-to-r from-[#1a1a1a] to-transparent mb-8 fade-up">

          Hello
        </div>

        <div className="flex items-center gap-8 opacity-50 fade-up">
          <span className="text-xs font-semibold text-[#444] tracking-[2px] mr-2">
            AGGREGATING
          </span>
          <Image src="/assets/protocols/jupiter.webp" alt="Jupiter" width={28} height={28} className="rounded-full opacity-60" />
          <Image src="/assets/protocols/drift.png" alt="Drift" width={28} height={28} className="rounded-full opacity-60" />
          <Image src="/assets/protocols/flash.jpg" alt="Flash" width={28} height={28} className="rounded-full opacity-60" />
          <Image src="/assets/protocols/hyperliquid.webp" alt="Hyperliquid" width={28} height={28} className="rounded-full opacity-60" />
        </div>
      </div>
    </section >
  );
}
