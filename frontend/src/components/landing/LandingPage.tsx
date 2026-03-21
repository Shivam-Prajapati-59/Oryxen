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

export default function LandingPage() {
  return (
    <div className="font-[DM_Sans,sans-serif] bg-black text-white overflow-x-hidden leading-relaxed antialiased **:box-border">
      {/* Dynamic Background Effect */}
      <div className="fixed top-0 left-0 w-screen h-screen -z-1 pointer-events-none overflow-hidden bg-black">
        <div className="absolute rounded-full blur-[320px] opacity-80 animate-[floatOrb_25s_infinite_ease-in-out_alternate] will-change-transform w-[600px] h-[600px] bg-[rgb(0,85,254)] -top-[100px] -right-[200px]"></div>
        <div className="absolute rounded-full blur-[320px] opacity-80 animate-[floatOrb_28s_infinite_ease-in-out_alternate] will-change-transform w-[500px] h-[500px] bg-[rgb(0,85,254)] bottom-[10%] -left-[150px] [animation-delay:-5s]"></div>
        <div className="absolute rounded-full blur-[320px] opacity-80 animate-[floatOrb_32s_infinite_ease-in-out_alternate] will-change-transform w-[450px] h-[450px] bg-[rgb(20,40,150)] top-[40%] left-[60%] -translate-x-1/2 [animation-delay:-12s]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E&quot;)] opacity-5 mix-blend-overlay"></div>
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
