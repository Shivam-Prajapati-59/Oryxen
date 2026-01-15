"use client";

import Container from "@/components/common/Container";
import TradingCard from "@/components/TradingCard/TradingCard";

export default function Home() {
  return (
    <Container>
      <div className="pt-4">
        <TradingCard />
      </div>
    </Container>
  );
}
