"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useDrift } from "./hooks/useDrift";

type DriftContextValue = ReturnType<typeof useDrift>;

const DriftContext = createContext<DriftContextValue | null>(null);

export function DriftProvider({ children }: { children: React.ReactNode }) {
    const drift = useDrift();

    // Memoize so consumers only re-render when actual Drift state changes
    const value = useMemo(() => drift, [
        drift.driftClient,
        drift.isInitialized,
        drift.isLoading,
        drift.error,
        drift.user,
        drift.userAccountExists,
        drift.solanaWallet,
        drift.connection,
    ]);

    return <DriftContext.Provider value={value}>{children}</DriftContext.Provider>;
}

export function useDriftContext(): DriftContextValue {
    const context = useContext(DriftContext);
    if (!context) {
        throw new Error("useDriftContext must be used within DriftProvider");
    }
    return context;
}
