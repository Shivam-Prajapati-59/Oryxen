"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] px-10 py-4 transition-all duration-300 max-md:px-5 max-md:py-3 ${
        scrolled
          ? "bg-black/80 backdrop-blur-[20px] border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <a href="#" className="flex items-center no-underline">
          <Image src="/oryx2.webp" alt="Oryxen" width={32} height={32} className="rounded-lg" />
          <span className="ml-2.5 text-lg font-semibold tracking-[-0.02em]">
            Oryxen
          </span>
        </a>

        <div className="flex gap-8 items-center max-md:hidden">
          {[
            { href: "#hero", label: "Home", active: true },
            { href: "#about", label: "About" },
            { href: "#features", label: "Features" },
            { href: "#protocols", label: "Protocols" },
            { href: "#faq", label: "FAQ" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-[#888] no-underline text-[15px] font-normal transition-colors duration-300 relative hover:text-white after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#0055FE] after:transition-all after:duration-300 hover:after:w-full ${
                link.active ? "text-white" : ""
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="/perps"
          className="px-6 py-2.5 bg-[#0055FE] text-white border-none rounded-[10px] text-sm font-medium cursor-pointer no-underline transition-all duration-300 hover:bg-[#0044cc] hover:-translate-y-px max-md:hidden"
        >
          Launch App
        </a>

        <button
          className="hidden max-md:block bg-none border-none cursor-pointer p-1"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="flex flex-col gap-[5px] w-6">
            <span
              className={`block h-0.5 bg-white rounded-sm transition-all duration-300 ${
                mobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            ></span>
            <span
              className={`block h-0.5 bg-white rounded-sm transition-all duration-300 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            ></span>
            <span
              className={`block h-0.5 bg-white rounded-sm transition-all duration-300 ${
                mobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            ></span>
          </span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="flex flex-col gap-4 p-5 bg-black/95 backdrop-blur-[20px] border-t border-[#1a1a1a]">
          {["Home", "About", "Features", "Protocols", "FAQ"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="text-[#888] no-underline text-[15px] transition-colors duration-300 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <a
            href="/perps"
            className="inline-flex w-fit px-6 py-2.5 bg-[#0055FE] text-white border-none rounded-[10px] text-sm font-medium cursor-pointer no-underline transition-all duration-300"
            onClick={() => setMobileMenuOpen(false)}
          >
            Launch App
          </a>
        </div>
      )}
    </nav>
  );
}
