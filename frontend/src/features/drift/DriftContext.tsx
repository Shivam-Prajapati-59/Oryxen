"use client";

import React, { createContext, useContext } from "react";
import { useDrift } from "./hooks/useDrift";

type DriftContextValue = ReturnType<typeof useDrift>;

const DriftContext = createContext<DriftContextValue | null>(null);

export function DriftProvider({ children }: { children: React.ReactNode }) {
    const drift = useDrift();

    return <DriftContext.Provider value={drift}>{children}</DriftContext.Provider>;
}

export function useDriftContext(): DriftContextValue {
    const context = useContext(DriftContext);
    if (!context) {
        throw new Error("useDriftContext must be used within DriftProvider");
    }
    return context;
}
