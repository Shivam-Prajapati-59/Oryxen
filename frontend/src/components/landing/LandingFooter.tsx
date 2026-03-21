"use client";

import { useState } from "react";
import Image from "next/image";

export default function LandingFooter() {
  const [email, setEmail] = useState("");

  return (
    <footer className="pt-20 px-10 pb-10 border-t border-[#1a1a1a] bg-[#080808] max-md:pt-[60px] max-md:px-5 max-md:pb-[30px]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] max-lg:grid-cols-2 max-md:grid-cols-1 gap-[60px] max-md:gap-10 pb-[60px]">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <Image src="/oryx2.webp" alt="Oryxen" width={32} height={32} className="rounded-lg" />
              <span className="text-lg font-semibold">Oryxen</span>
            </div>
            <p className="text-sm text-[#888] leading-[1.7] mb-6">
              The Solana perpetual trading aggregator.
              <br />
              Best prices, deepest liquidity, one platform.
            </p>
            <div className="flex overflow-hidden rounded-[10px] border border-[#1a1a1a] max-w-[340px]">
              <input
                type="email"
                placeholder="Enter Your Email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/[0.03] border-none text-sm text-white font-['DM_Sans',sans-serif] outline-none placeholder:text-[#666]"
              />
              <button className="px-5 py-3 bg-[#0055FE] text-white border-none text-sm font-medium cursor-pointer font-['DM_Sans',sans-serif] transition-colors duration-300 whitespace-nowrap hover:bg-[#0044cc]">
                Subscribe
              </button>
            </div>
          </div>

          {/* Links Columns */}
          <div className="flex gap-[60px]">
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-semibold mb-2">Product</h4>
              <a href="/perps" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">Trade Perps</a>
              <a href="/funding-rate" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">Funding Rates</a>
              <a href="/liquidation" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">Liquidations</a>
              <a href="/leaderboard" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">Leaderboard</a>
              <a href="#faq" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">FAQ</a>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-semibold mb-2">Community</h4>
              <a href="#" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">Twitter (X)</a>
              <a href="#" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">Discord</a>
              <a href="#" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">Telegram</a>
              <a href="#" className="text-sm text-[#888] no-underline transition-colors duration-300 hover:text-white">GitHub</a>
            </div>
          </div>

          {/* Counter Column */}
          <div className="flex flex-col gap-4 items-start">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.03] border border-[#1a1a1a] rounded-full text-sm">
              <span className="text-[#888]">Total Volume –</span>
              <span className="text-white font-semibold">$1.2B+</span>
            </div>
            <div className="w-[200px] h-[130px] rounded-xl overflow-hidden border border-[#1a1a1a]">
              <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] flex items-center justify-center rounded-xl">
                <div className="w-12 h-12 bg-[rgba(0,85,254,0.8)] rounded-full flex items-center justify-center text-base text-white transition-transform duration-300 hover:scale-110">
                  ▶
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-[#1a1a1a] text-sm text-[#888] max-md:flex-col max-md:gap-4 max-md:text-center">
          <span>© 2025 Oryxen Protocol</span>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[#888] no-underline transition-colors duration-300 hover:text-white">Terms of Service</a>
            <span className="opacity-30">|</span>
            <a href="#" className="text-[#888] no-underline transition-colors duration-300 hover:text-white">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
