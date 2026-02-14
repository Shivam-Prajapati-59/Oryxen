// frontend/src/features/drift/hooks/useDriftAdapter.ts

"use client";

import { useEffect, useRef } from "react";
import { useDriftContext } from "../DriftContext";
import { DriftAdapter } from "../DriftAdapter";
import { useProtocol } from "@/features/protocol-adapter/ProtocolContext";

export const useDriftAdapter = () => {
  const drift = useDriftContext();
  const { registerAdapter, unregisterAdapter } = useProtocol();
  const adapterRef = useRef<DriftAdapter | null>(null);

  // Auto-initialize Drift when wallet is connected
  useEffect(() => {
    if (drift.solanaWallet && !drift.isInitialized && !drift.isLoading) {
      drift.initializeDriftClient();
    }
  }, [
    drift.solanaWallet,
    drift.isInitialized,
    drift.isLoading,
    drift.initializeDriftClient,
  ]);

  // Create adapter once (stable reference for context Map)
  if (!adapterRef.current) {
    adapterRef.current = new DriftAdapter(drift);
  }

  // Update the internal hook ref every render so methods use latest state
  adapterRef.current.updateHook(drift);

  // Register once on mount, unregister on unmount
  useEffect(() => {
    if (adapterRef.current) {
      registerAdapter(adapterRef.current);
    }
    return () => {
      unregisterAdapter("drift");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — adapter is mutable and stable

  return adapterRef.current;
};
