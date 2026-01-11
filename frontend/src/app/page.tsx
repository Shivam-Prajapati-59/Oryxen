"use client";

import { usePerps } from "@/hooks/usePerps";
import OverViewCard from "@/components/funding-rate/OverViewCard";
import Container from "@/components/common/Container";

export default function Home() {
  const { data: perps, isLoading, isError, error } = usePerps();

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="flex items-center justify-center min-h-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading perpetuals...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container className="py-8">
        <div className="flex items-center justify-center min-h-100">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Perpetual Markets</h1>
        <p className="text-muted-foreground">
          View all available perpetual contracts
        </p>
      </div>
      <OverViewCard perps={perps || []} />
    </Container>
  );
}
