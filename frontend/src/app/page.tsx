"use client";

import Container from "@/components/common/Container";
import DemoDrift from "@/components/demo/DemoDrift";
import DemoFlash from "@/components/demo/DemoFlash";
import DemoPacifica from "@/components/demo/DemoPacifica";
import TradingCard from "@/components/TradingCard/TradingCard";
import DemoGmt from "@/components/demo/DemoGmSol";


export default function Home() {
  return (
    <Container>
      <div className="pt-0">
        <TradingCard />
      </div>
      {/* <DemoPacifica /> */}
      {/* <DemoDrift /> */}
      {/* <DemoFlash /> */}
      <DemoGmt />
    </Container>
  );
}
