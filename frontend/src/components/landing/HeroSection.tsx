"use client";

import Link from "next/link";
import Image from "next/image";
import LightPillar from "@/components/LightPillar";

const protocolCards = [
  {
    name: "Drift",
    image: "/assets/protocols/drift.png",
    blurb: "Deep perpetual markets with mature margin tooling on Solana.",
    accent: "from-sky-400/30 via-cyan-300/10 to-transparent",
  },
  {
    name: "GMXSol",
    image: "/assets/protocols/gmxsol.svg",
    blurb: "Alternative perp liquidity path for sharper fills and optionality.",
    accent: "from-fuchsia-400/30 via-violet-300/10 to-transparent",
  },
];

const heroStats = [
  { label: "Protocols routed", value: "2" },
  { label: "Execution surface", value: "Single trade flow" },
  { label: "Funding intel", value: "Live comparison" },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(76,29,149,0.28),_rgba(8,12,24,0.92)_40%,_#050816_75%)] px-6 pb-20 pt-32 text-white md:px-10 md:pb-28 md:pt-36"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-85">
          <LightPillar
            className="h-full w-full"
            topColor="#79B8FF"
            bottomColor="#F472B6"
            intensity={1.1}
            rotationSpeed={0.18}
            glowAmount={0.01}
            pillarWidth={2.8}
            pillarHeight={0.55}
            noiseIntensity={0.18}
            pillarRotation={7}
            mixBlendMode="screen"
            quality="medium"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,17,0.16),rgba(4,7,17,0.72)_45%,rgba(4,7,17,0.96))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-14 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/75 backdrop-blur">
            Solana Perps Router
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Drift + GMXSol
          </div>

          <h1 className="max-w-4xl text-[clamp(3.25rem,8vw,6.8rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
            Clean routing for
            <span className="block bg-gradient-to-r from-white via-cyan-100 to-fuchsia-200 bg-clip-text text-transparent">
              Solana perpetual trades.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            Oryxen gives one focused execution surface across Drift and GMXSol,
            so you compare opportunities faster, move with less UI friction,
            and stay inside a cleaner trading workflow.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/trade"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              Launch Trade Terminal
            </Link>
            <Link
              href="#protocols"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/6 px-6 py-3.5 text-sm font-semibold text-white/90 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/12"
            >
              Explore Protocol Split
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/6 px-5 py-4 backdrop-blur-sm"
              >
                <div className="text-2xl font-semibold tracking-[-0.04em] text-white">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-slate-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid w-full max-w-2xl gap-4 md:grid-cols-2 lg:pb-2">
          {protocolCards.map((card, index) => (
            <article
              key={card.name}
              className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(3,8,20,0.45)] backdrop-blur transition duration-500 hover:-translate-y-1 ${
                index === 0 ? "md:translate-y-10" : ""
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-80 transition duration-500 group-hover:opacity-100`}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/55">
                    Connected Venue
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/70">
                    Live route
                  </div>
                </div>

                <div className="mt-10 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
                    <Image
                      src={card.image}
                      alt={card.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                      {card.name}
                    </h2>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-300">
                      {card.blurb}
                    </p>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-3 text-sm text-slate-200">
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                    <div className="text-white/55">Surface</div>
                    <div className="mt-1 font-medium">Perpetuals</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                    <div className="text-white/55">Role</div>
                    <div className="mt-1 font-medium">Execution source</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
