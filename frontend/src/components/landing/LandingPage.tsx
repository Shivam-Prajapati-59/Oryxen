"use client";

import LandingNavbar from "./LandingNavbar";
import HeroSection from "./HeroSection";
import AboutSection from "./AboutSection";
import ResultsSection from "./ResultsSection";
import ProcessSection from "./ProcessSection";
import FeaturesSection from "./FeaturesSection";
import BenefitsSection from "./BenefitsSection";
import PortfolioSection from "./PortfolioSection";
import PricingSection from "./PricingSection";
import TestimonialsSection from "./TestimonialsSection";
import FAQSection from "./FAQSection";
import CTASection from "./CTASection";
import LandingFooter from "./LandingFooter";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Dynamic Background Effect */}
      <div className="landing-bg-effect">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="glow-orb orb-3"></div>
        <div className="noise-overlay"></div>
      </div>

      <LandingNavbar />
      <HeroSection />
      <AboutSection />
      <ResultsSection />
      <ProcessSection />
      <FeaturesSection />
      <BenefitsSection />
      <PortfolioSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
