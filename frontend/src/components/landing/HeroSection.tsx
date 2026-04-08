"use client";

import Link from "next/link";
import LightPillar from "@/components/LightPillar";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(76,29,149,0.28),rgba(8,12,24,0.92)_40%,#050816_75%)] px-6 pb-20 pt-32 text-white md:px-10 md:pb-28 md:pt-36 h-screen"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-85">
          <LightPillar
            topColor="#1a0c55"
            bottomColor="#4522a5"
            intensity={1}
            rotationSpeed={0.3}
            glowAmount={0.002}
            pillarWidth={3}
            pillarHeight={0.4}
            noiseIntensity={0.5}
            pillarRotation={25}
            interactive={false}
            mixBlendMode="screen"
            quality="high"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,17,0.16),rgba(4,7,17,0.72)_45%,rgba(4,7,17,0.96))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-14 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="max-w-4xl text-[clamp(3.25rem,8vw,6.8rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
            Advanced routing for
            <span className="block bg-linear-to-r from-white via-cyan-200 to-blue-500 bg-clip-text text-transparent">
              Solana perpetuals.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            An institutional-grade trading terminal. Oryxen unifies liquidity across Drift, GMX-Solana, Hyperliquid, Jupiter, Pacifica, and Orderly Network to deliver optimal price execution and zero UI friction.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {/* Primary Action Button */}
            <Link
              href="/trade"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition-all duration-500 ease-out
      shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_0_0_1px_rgba(255,255,255,0.08)]
      hover:shadow-[inset_0_0_24px_6px_rgba(103,232,249,0.25),0_0_32px_4px_rgba(103,232,249,0.15),0_0_0_1px_rgba(103,232,249,0.3)]
      hover:bg-[linear-gradient(135deg,#ffffff,#e0f9ff)]
      hover:text-slate-800"
            >
              <span className="relative z-10 transition-all duration-500">
                Launch Terminal
              </span>
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.18) 0%, transparent 70%)",
                }}
              />
            </Link>

            {/* Secondary Action Button - Watch Demo */}
            <Link
              href="https://www.loom.com/share/5e4cc89ec6344ac5a31b7b77c7d75838"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/15 bg-white/6 px-6 py-3.5 text-sm font-semibold text-white/90 backdrop-blur transition-all duration-500 ease-out
      shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.2)]
      hover:border-blue-500/40
      hover:shadow-[inset_0_0_28px_6px_rgba(37,99,235,0.2),0_0_24px_2px_rgba(37,99,235,0.15),inset_0_1px_0_rgba(255,255,255,0.14)]
      hover:bg-white/10 hover:text-white"
            >
              <span className="relative z-10 flex items-center gap-2 transition-all duration-500">
                {/* SVG Play Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300 group-hover:scale-110 group-hover:text-blue-400"
                >
                  <polygon points="6 3 20 12 6 21 6 3"></polygon>
                </svg>
                Watch Demo
              </span>
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.2) 0%, transparent 68%)",
                }}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}