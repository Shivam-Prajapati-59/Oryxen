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
    <nav className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">
        <a href="#" className="navbar-logo">
          <Image src="/oryx2.webp" alt="Oryxen" width={32} height={32} className="rounded-lg" />
          <span style={{ marginLeft: "10px", fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Oryxen
          </span>
        </a>

        <div className="navbar-links">
          <a href="#hero" className="nav-link active">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#protocols" className="nav-link">Protocols</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>

        <a href="/perps" className="navbar-cta">Launch App</a>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${mobileMenuOpen ? "open" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          <a href="#hero" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="#about" className="nav-link" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#protocols" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Protocols</a>
          <a href="#faq" className="nav-link" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <a href="/perps" className="navbar-cta" onClick={() => setMobileMenuOpen(false)}>Launch App</a>
        </div>
      )}
    </nav>
  );
}
