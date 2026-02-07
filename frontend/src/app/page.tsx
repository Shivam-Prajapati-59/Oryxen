"use client";

import Container from "@/components/common/Container";
import DemoDrift from "@/components/common/DemoDrift";
import DemoFlash from "@/components/common/DemoFlash";
import DemoPacifica from "@/components/common/DemoPacifica";
import TradingCard from "@/components/TradingCard/TradingCard";


export default function Home() {
  return (
    <Container>
      <div className="pt-0">
        <TradingCard />
      </div>
      {/* <DemoPacifica /> */}
      {/* <DemoDrift /> */}
      <DemoFlash />
    </Container>
  );
}
