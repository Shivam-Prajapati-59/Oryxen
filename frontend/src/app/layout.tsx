import type { Metadata } from "next";
import { Noto_Sans, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers/provider";
import Navbar from "@/components/layout/Navbar";
import { ViewTransitions } from "next-view-transitions";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oryxen",
  description: "DeFi perpetuals trading aggregator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransitions>
      <html lang="en" suppressHydrationWarning suppressContentEditableWarning>
        <body
          className={`${notoSans.variable} ${ibmPlexSans.variable} antialiased`}
        >
          <Providers>
            <Navbar />
            {children}
          </Providers>
        </body>
      </html>
    </ViewTransitions>
  );
}
