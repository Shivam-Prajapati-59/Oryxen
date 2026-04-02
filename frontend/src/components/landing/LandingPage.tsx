"use client";

import LandingFooter from "./LandingFooter";
import FeaturesGrid from "./FeaturesGrid";
import HeroSection from "./HeroSection";
import LandingNavbar from "./LandingNavbar";

export default function LandingPage() {
  return (
    <main className="bg-[#050816] text-white" style={{ fontFamily: "var(--font-dm-sans)" }}>
      <LandingNavbar />
      <HeroSection />
      <FeaturesGrid />
      <LandingFooter />
    </main>
  );
}
