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
    <section id="faq" className="faq-section" ref={sectionRef}>
      <div className="faq-container">
        <div className="section-badge center fade-up">
          <span className="badge-dot"></span>
          <span>FAQ</span>
        </div>

        <h2 className="section-title-center fade-up">
          Frequently Asked Questions
        </h2>

        <div className="faq-list fade-up">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${openIndex === index ? "open" : ""}`}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <div className="faq-question">
                <span>{faq.question}</span>
                <svg
                  className={`faq-chevron ${openIndex === index ? "rotated" : ""}`}
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
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <a href="/perps" className="btn-primary faq-cta fade-up">
          Start Trading Now
        </a>
      </div>
    </section>
  );
}
