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
    <section className="py-[60px] px-10 max-md:py-20 max-md:px-5" ref={sectionRef}>
      <div className="max-w-[1200px] mx-auto">
        <div className="fade-up">
          <div className="w-full rounded-[20px] overflow-hidden relative h-[500px] border border-[#1a1a1a]">
            <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] via-[60%] to-[#0a0a0a] bg-[length:200%_200%] animate-[shimmer_8s_linear_infinite] rounded-[20px] border border-[#1a1a1a]"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
