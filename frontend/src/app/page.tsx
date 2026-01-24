"use client";

import ConnectWallet from "@/components/common/ConnectWallet";
import Container from "@/components/common/Container";
import TradingCard from "@/components/TradingCard/TradingCard";

export default function Home() {
  return (
    <Container>
      <div className="pt-0">
        <TradingCard />
      </div>
      <ConnectWallet />
    </Container>
  );
}
