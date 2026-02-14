"use client";

import { ThemeProvider } from "@/components/common/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import PrivyProviders from "./privyprovider";
import { Toaster } from "@/components/ui/sonner";
import { ProtocolProvider } from "@/features/protocol-adapter/ProtocolContext";
import { DriftProvider } from "@/features/drift/DriftContext";
import { useDriftAdapter } from "@/features/drift/hooks/useDriftAdapter";

/** Registers all protocol adapters — must be inside ProtocolProvider & DriftProvider */
function ProtocolInitializer() {
    useDriftAdapter();
    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );
    return (
        <PrivyProviders>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ProtocolProvider>
                        <DriftProvider>
                            <ProtocolInitializer />
                            {children}
                        </DriftProvider>
                    </ProtocolProvider>
                    <Toaster />
                </ThemeProvider>
            </QueryClientProvider>
        </PrivyProviders>
    );
}