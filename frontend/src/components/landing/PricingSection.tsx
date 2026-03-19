"use client";

import { useEffect, useRef } from "react";

export default function PricingSection() {
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
    <section className="pricing-section" ref={sectionRef}>
      <div className="pricing-container">
        <div className="pricing-image fade-up">
          <div className="image-placeholder pricing-img">
            <div className="placeholder-gradient"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
