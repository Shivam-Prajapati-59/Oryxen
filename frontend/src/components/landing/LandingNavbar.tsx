"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navItems = [
  { href: "#hero", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#features", label: "Workflow" },
  { href: "#protocols", label: "Protocols" },
  { href: "#faq", label: "FAQ" },
];

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
      className={`fixed left-0 right-0 top-0 z-[1000] px-6 py-4 transition-all duration-300 md:px-10 ${
        scrolled
          ? "border-b border-white/10 bg-[#06101f]/72 backdrop-blur-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <a
          href="#hero"
          className="text-lg font-semibold tracking-[-0.05em] text-white no-underline"
        >
          <span className="text-white/65">O</span>
          <span className="text-white">ryxen</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/funding-rate"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Funding Rates
          </Link>
          <Link
            href="/trade"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
          >
            Launch App
          </Link>
        </div>

        <button
          className="block rounded-full border border-white/10 bg-white/5 p-2 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="flex w-5 flex-col gap-1.5">
            <span
              className={`block h-0.5 rounded-sm bg-white transition-all duration-300 ${
                mobileMenuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            ></span>
            <span
              className={`block h-0.5 rounded-sm bg-white transition-all duration-300 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            ></span>
            <span
              className={`block h-0.5 rounded-sm bg-white transition-all duration-300 ${
                mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            ></span>
          </span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mx-auto mt-4 max-w-7xl rounded-[1.75rem] border border-white/10 bg-[#09111d]/95 p-5 backdrop-blur-2xl md:hidden">
          <div className="flex flex-col gap-4">
            {navItems.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-300 transition hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/funding-rate"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white/85"
              onClick={() => setMobileMenuOpen(false)}
            >
              Funding Rates
            </Link>
            <Link
              href="/trade"
              className="rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-slate-950"
              onClick={() => setMobileMenuOpen(false)}
            >
              Launch App
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
