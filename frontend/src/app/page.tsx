"use client";

import Container from "@/components/common/Container";
import DemoDrift from "@/components/common/DemoDrift";
import TradingCard from "@/components/TradingCard/TradingCard";


export default function Home() {
  return (
    <Container>
      <div className="pt-0">
        <TradingCard />
      </div>
      <DemoDrift />
    </Container>
  );
}
