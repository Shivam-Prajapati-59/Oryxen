"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CandlestickChart,
  LayoutPanelLeft,
  ShieldCheck,
  Waves,
} from "lucide-react";

const coreFeatures = [
  {
    icon: LayoutPanelLeft,
    title: "Single trading surface",
    description:
      "One interface for routing, sizing, and comparing perp opportunities without bouncing between protocol dashboards.",
  },
  {
    icon: Waves,
    title: "Protocol-aware execution",
    description:
      "Drift and GMXSol stay visible as distinct liquidity venues, so your routing model remains explicit instead of hidden.",
  },
  {
    icon: CandlestickChart,
    title: "Funding context nearby",
    description:
      "Execution and funding-rate monitoring live in the same product, which keeps directional decisions tighter.",
  },
  {
    icon: ShieldCheck,
    title: "Cleaner operator flow",
    description:
      "Lean UI, fewer dead ends, and clearer state transitions reduce hesitation when moving from analysis to order entry.",
  },
];

const protocolCards = [
  {
    name: "Drift",
    image: "/assets/protocols/drift.png",
    eyebrow: "Execution venue 01",
    summary:
      "The primary Solana-native perp venue in the stack, suited to active trading with mature collateral and margin mechanics.",
    strengths: ["Mature perp surface", "Detailed account context", "Integrated position workflow"],
  },
  {
    name: "GMXSol",
    image: "/assets/protocols/gmxsol.svg",
    eyebrow: "Execution venue 02",
    summary:
      "An additional perp route that expands optionality when evaluating where a trade should be expressed on-chain.",
    strengths: ["Alternative route source", "Direct order path", "Complements Drift coverage"],
  },
];

const steps = [
  {
    index: "01",
    title: "Scan the market",
    description:
      "Start with the funding dashboard or jump directly into trade mode when you already know the asset.",
  },
  {
    index: "02",
    title: "Compare protocol context",
    description:
      "Inspect the setup through Drift and GMXSol lenses instead of treating every venue as interchangeable liquidity.",
  },
  {
    index: "03",
    title: "Route with less friction",
    description:
      "Commit from one clean order surface and stay inside the same environment through execution and monitoring.",
  },
];

const faqs = [
  {
    question: "What does Oryxen aggregate today?",
    answer:
      "The current landing page reflects the active perp routing focus across Drift and GMXSol only.",
  },
  {
    question: "Where should new users start?",
    answer:
      "Open the trade terminal if you want execution first, or check funding rates if you want directional context before entering.",
  },
  {
    question: "Why keep protocol cards visible?",
    answer:
      "Because venue differences matter. The landing page keeps Drift and GMXSol explicit so the product message matches the actual workflow.",
  },
];

export default function FeaturesGrid() {
  return (
    <div className="bg-[#050816] text-white">
      <section
        id="about"
        className="border-b border-white/8 px-6 py-20 md:px-10 md:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="max-w-xl">
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/75">
              About Oryxen
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              A trading entry point built for clarity, not noise.
            </h2>
            <p className="mt-6 text-base leading-8 text-slate-300">
              The landing experience now matches the product direction: two
              supported venues, one trade path, and a cleaner message around
              routing perpetual exposure on Solana.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {coreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="protocols"
        className="border-b border-white/8 px-6 py-20 md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-[0.28em] text-fuchsia-300/75">
                Supported Venues
              </div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                Drift and GMXSol, presented as focused execution lanes.
              </h2>
            </div>
            <Link
              href="/trade"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition hover:text-white"
            >
              Open trade terminal
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {protocolCards.map((card) => (
              <article
                key={card.name}
                className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-7"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_32%)]" />
                <div className="relative">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/55">
                    {card.eyebrow}
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
                      <Image
                        src={card.image}
                        alt={card.name}
                        width={46}
                        height={46}
                        className="h-11 w-11 object-contain"
                      />
                    </div>
                    <h3 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                      {card.name}
                    </h3>
                  </div>
                  <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300">
                    {card.summary}
                  </p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {card.strengths.map((strength) => (
                      <div
                        key={strength}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
                      >
                        {strength}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-b border-white/8 px-6 py-20 md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.28em] text-emerald-300/75">
              Workflow
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              The landing narrative should map directly to what the product does.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.index}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="text-xs font-medium tracking-[0.28em] text-white/45">
                  {step.index}
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-white">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-xl">
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/75">
              FAQ
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Fast answers for the current product scope.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-6 py-5"
              >
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
                  {faq.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
