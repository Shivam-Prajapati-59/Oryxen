import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "../globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Landin - Premium Agency for Creatives",
  description:
    "We specialize in crafting unique digital presence that help businesses grow and stand out in their industries.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${dmSans.variable}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </div>
  );
}
