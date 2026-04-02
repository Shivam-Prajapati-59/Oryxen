import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "../globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oryxen Landing",
  description:
    "Oryxen routes Solana perpetual trades across Drift and GMXSol through one cleaner execution surface.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={dmSans.variable}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </div>
  );
}
