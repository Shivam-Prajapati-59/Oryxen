"use client";

import LandingNavbar from "./LandingNavbar";
import HeroSection from "./HeroSection";

import LandingFooter from "./LandingFooter";

export default function LandingPage() {
  return (
    <div className="font-[DM_Sans,sans-serif]">

      <LandingNavbar />
      <HeroSection />
      <LandingFooter />
    </div>
  );
}
