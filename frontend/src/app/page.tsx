"use client";

import Container from "@/components/common/Container";
import TradingCard from "@/components/TradingCard/TradingCard";
import DemoGmSol from "@/components/demo/DemoGmXSol";

export default function Home() {
  return (
    <Container>
      <div className="pt-0 ">
        <TradingCard />
      </div>
      {/* <DemoPacifica /> */}
      {/* <DemoDrift /> */}
      {/* <DemoFlash /> */}
      {/* <DemoGmt /> */}
      <DemoGmSol />z
    </Container>
  );
}
