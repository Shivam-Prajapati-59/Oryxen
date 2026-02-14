"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { IProtocolAdapter, ProtocolName } from "./types";

interface ProtocolContextValue {
    activeProtocol: ProtocolName | null;
    adapter: IProtocolAdapter | null;
    setProtocol: (protocol: ProtocolName | null) => void;
    registerAdapter: (adapter: IProtocolAdapter) => void;
    unregisterAdapter: (name: ProtocolName) => void;
}

const ProtocolContext = createContext<ProtocolContextValue | null>(null);

export const ProtocolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeProtocol, setActiveProtocol] = useState<ProtocolName | null>(null);
    const [adapters, setAdapters] = useState<Map<ProtocolName, IProtocolAdapter>>(new Map());

    const registerAdapter = useCallback((adapter: IProtocolAdapter) => {
        setAdapters((prev) => {
            const next = new Map(prev);
            next.set(adapter.name, adapter);
            return next;
        });
    }, []);

    const unregisterAdapter = useCallback((name: ProtocolName) => {
        // Read adapter before state update so cleanup happens outside the updater
        setAdapters((prev) => {
            const adapter = prev.get(name);
            if (adapter) {
                // Schedule cleanup outside React's state updater
                queueMicrotask(() => adapter.cleanup());
            }
            if (!prev.has(name)) return prev;
            const next = new Map(prev);
            next.delete(name);
            return next;
        });

        // Clear activeProtocol if it pointed to the removed adapter
        setActiveProtocol((current) => (current === name ? null : current));
    }, []);

    const setProtocol = useCallback((protocol: ProtocolName | null) => {
        setActiveProtocol(protocol);
    }, []);

    const adapter = useMemo(() => {
        if (!activeProtocol) return null;
        return adapters.get(activeProtocol) || null;
    }, [activeProtocol, adapters]);

    const value = useMemo(
        () => ({
            activeProtocol,
            adapter,
            setProtocol,
            registerAdapter,
            unregisterAdapter,
        }),
        [activeProtocol, adapter, setProtocol, registerAdapter, unregisterAdapter]
    );

    return <ProtocolContext.Provider value={value}>{children}</ProtocolContext.Provider>;
};

export const useProtocol = () => {
    const context = useContext(ProtocolContext);
    if (!context) {
        throw new Error("useProtocol must be used within ProtocolProvider");
    }
    return context;
};