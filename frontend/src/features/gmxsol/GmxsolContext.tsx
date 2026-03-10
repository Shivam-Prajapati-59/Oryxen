"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useGmsol } from "./hooks/useGmsol";

type GmxsolContextValue = ReturnType<typeof useGmsol>;

const GmxsolContext = createContext<GmxsolContextValue | null>(null);

export function GmxsolProvider({ children }: { children: React.ReactNode }) {
    const gmsol = useGmsol();

    const value = useMemo(() => gmsol, [gmsol]);

    return (
        <GmxsolContext.Provider value={value}>{children}</GmxsolContext.Provider>
    );
}

export function useGmxsolContext(): GmxsolContextValue {
    const context = useContext(GmxsolContext);
    if (!context) {
        throw new Error("useGmxsolContext must be used within GmxsolProvider");
    }
    return context;
}
