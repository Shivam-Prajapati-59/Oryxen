"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingFooter() {
  const [email, setEmail] = useState("");

  return (
    <footer className="border-t border-white/8 bg-[#040714] px-6 pb-10 pt-20 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 pb-14 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="text-lg font-semibold tracking-[-0.05em] text-white">
              Oryxen
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              A cleaner landing and routing layer for Solana perpetual trading,
              currently focused on Drift and GMXSol execution flow.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setEmail(""); }} className="mt-6 flex max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <input
                type="email"
                placeholder="Email for product updates"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-500"
                required
              />
              <button type="submit" className="bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50">
                Subscribe
              </button>
            </form>
          </div>

          <div className="grid gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">
              Product
            </h4>
            <Link href="/trade" className="text-sm text-slate-300 transition hover:text-white">
              Trade Terminal
            </Link>
            <Link href="/funding-rate" className="text-sm text-slate-300 transition hover:text-white">
              Funding Rates
            </Link>
            <a href="#protocols" className="text-sm text-slate-300 transition hover:text-white">
              Protocol Coverage
            </a>
            <a href="#faq" className="text-sm text-slate-300 transition hover:text-white">
              FAQ
            </a>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">
              Focus
            </h4>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Routing Layer
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                Drift + GMXSol
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Leaner landing copy, cleaner navigation, and a hero that now
                reflects the actual supported execution layer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/8 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>© 2026 Oryxen</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/trade" className="transition hover:text-white">
              Open App
            </Link>
            <Link href="/funding-rate" className="transition hover:text-white">
              Funding Rates
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
