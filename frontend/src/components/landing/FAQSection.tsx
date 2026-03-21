"use client";

import { useEffect, useRef, useState } from "react";

const faqs = [
  {
    question: "What is Oryxen?",
    answer:
      "Oryxen is a perpetual trading aggregator on Solana. It routes your trades across multiple DEXs (Jupiter, Drift, Flash Trade) to find the best execution price, lowest fees, and deepest liquidity.",
  },
  {
    question: "How does smart order routing work?",
    answer:
      "When you place a trade, Oryxen simultaneously checks pricing, slippage, and fees across all connected protocols. It then routes your order to the venue offering the best overall execution — all in milliseconds.",
  },
  {
    question: "Is Oryxen non-custodial?",
    answer:
      "Yes, 100%. Oryxen never holds your funds. You trade directly from your Solana wallet (Phantom, Backpack, Solflare). Your keys, your coins.",
  },
  {
    question: "What leverage is available?",
    answer:
      "Leverage varies by protocol and market. Generally, you can access up to 20x leverage on major pairs like SOL-PERP and BTC-PERP. Oryxen shows you the max available leverage per venue.",
  },
  {
    question: "Does Oryxen charge any fees?",
    answer:
      "Oryxen charges zero platform fees. You only pay the underlying protocol fees (trading fees, borrowing fees) which are transparently displayed before each trade.",
  },
  {
    question: "Which wallets are supported?",
    answer:
      "Oryxen supports all major Solana wallets including Phantom, Backpack, Solflare, and any wallet compatible with the Solana Wallet Adapter standard.",
  },
];

export default function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
    <section id="faq" className="py-[120px] px-10 max-md:py-20 max-md:px-5" ref={sectionRef}>
      <div className="max-w-[800px] mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#1a1a1a] rounded-full text-sm text-white mx-auto fade-up">
          <span className="w-2 h-2 bg-[#0055FE] rounded-full inline-block"></span>
          <span>FAQ</span>
        </div>

        <h2 className="text-center text-[clamp(36px,5vw,64px)] font-medium leading-[1.15] mt-6 tracking-[-0.02em] max-sm:text-[32px] fade-up">
          Frequently Asked Questions
        </h2>

        <div className="mt-12 flex flex-col gap-2 text-left fade-up">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border rounded-xl overflow-hidden cursor-pointer transition-colors duration-300 ${
                openIndex === index
                  ? "border-[rgba(0,85,254,0.3)]"
                  : "border-[#1a1a1a] hover:border-[#333]"
              }`}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <div className="flex justify-between items-center px-6 py-5 text-base font-medium text-white">
                <span>{faq.question}</span>
                <svg
                  className={`transition-transform duration-300 text-[#888] shrink-0 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  openIndex === index ? "max-h-[200px]" : "max-h-0"
                }`}
              >
                <p className="px-6 pb-5 text-[15px] text-[#888] leading-[1.7]">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <a
          href="/perps"
          className="inline-flex items-center justify-center px-7 py-3.5 bg-[#0055FE] text-white border-none rounded-[10px] text-[15px] font-medium cursor-pointer no-underline transition-all duration-300 whitespace-nowrap hover:bg-[#0044cc] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,85,254,0.3)] mt-10 fade-up"
        >
          Start Trading Now
        </a>
      </div>
    </section>
  );
}
