"use client";

import { useState } from "react";
import Image from "next/image";

export default function LandingFooter() {
  const [email, setEmail] = useState("");

  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Image src="/oryx2.webp" alt="Oryxen" width={32} height={32} className="rounded-lg" />
              <span style={{ fontSize: "18px", fontWeight: 600 }}>Oryxen</span>
            </div>
            <p className="footer-tagline">
              The Solana perpetual trading aggregator.
              <br />
              Best prices, deepest liquidity, one platform.
            </p>
            <div className="newsletter-form">
              <input
                type="email"
                placeholder="Enter Your Email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="newsletter-input"
              />
              <button className="newsletter-btn">Subscribe</button>
            </div>
          </div>

          <div className="footer-links-group">
            <div className="footer-links-col">
              <h4 className="footer-links-title">Product</h4>
              <a href="/perps" className="footer-link">Trade Perps</a>
              <a href="/funding-rate" className="footer-link">Funding Rates</a>
              <a href="/liquidation" className="footer-link">Liquidations</a>
              <a href="/leaderboard" className="footer-link">Leaderboard</a>
              <a href="#faq" className="footer-link">FAQ</a>
            </div>
            <div className="footer-links-col">
              <h4 className="footer-links-title">Community</h4>
              <a href="#" className="footer-link">Twitter (X)</a>
              <a href="#" className="footer-link">Discord</a>
              <a href="#" className="footer-link">Telegram</a>
              <a href="#" className="footer-link">GitHub</a>
            </div>
          </div>

          <div className="footer-counter">
            <div className="sales-counter">
              <span className="counter-label">Total Volume –</span>
              <span className="counter-value">$1.2B+</span>
            </div>
            <div className="footer-video-placeholder">
              <div className="placeholder-gradient video-thumb">
                <div className="play-button">▶</div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2025 Oryxen Protocol</span>
          <div className="footer-legal">
            <a href="#" className="footer-legal-link">Terms of Service</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-legal-link">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
