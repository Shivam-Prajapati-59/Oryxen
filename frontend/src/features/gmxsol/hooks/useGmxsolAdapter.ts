"use client";

import { useEffect, useRef } from "react";
import { useGmxsolContext } from "../GmxsolContext";
import { GmxsolAdapter } from "../GmxsolAdapter";
import { useProtocol } from "@/features/protocol-adapter/ProtocolContext";

export const useGmxsolAdapter = () => {
  const gmsol = useGmxsolContext();
  const { registerAdapter, unregisterAdapter } = useProtocol();
  const adapterRef = useRef<GmxsolAdapter | null>(null);

  // Create adapter once (stable reference for context Map)
  if (!adapterRef.current) {
    adapterRef.current = new GmxsolAdapter(gmsol);
  }

  // Update the internal hook ref every render so methods use latest state
  adapterRef.current.updateHook(gmsol);

  // Register once on mount, unregister on unmount
  useEffect(() => {
    if (adapterRef.current) {
      registerAdapter(adapterRef.current);
    }
    return () => {
      unregisterAdapter("GMXSol");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return adapterRef.current;
};
