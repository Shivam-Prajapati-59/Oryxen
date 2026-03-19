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
    <section className="testimonials-section" ref={sectionRef}>
      <div className="testimonials-container">
        <div className="section-badge center fade-up">
          <span className="badge-dot"></span>
          <span>Community</span>
        </div>

        <h2 className="section-title-center fade-up">
          What Traders Say
          <br />
          <span className="text-dim">About Trading On Oryxen.</span>
        </h2>

        <div className="testimonials-grid fade-up">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{testimonial.avatar}</div>
                <div>
                  <p className="testimonial-name">{testimonial.name}</p>
                  <p className="testimonial-role">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
