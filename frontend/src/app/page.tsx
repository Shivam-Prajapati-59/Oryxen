"use client";

import Container from "@/components/common/Container";
import DemoDrift from "@/components/demo/DemoDrift";
import DemoFlash from "@/components/demo/DemoFlash";
import DemoPacifica from "@/components/demo/DemoPacifica";
import DemoJupiter from "@/components/demo/DemoJupiter";
import TradingCard from "@/components/TradingCard/TradingCard";


export default function Home() {
  return (
    <Container>
      <div className="pt-0">
        <TradingCard />
      </div>
      {/* <DemoPacifica /> */}
      {/* <DemoDrift /> */}
      {/* <DemoFlash /> */}
      <DemoJupiter />
    </Container>
  );
}
