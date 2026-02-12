"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/button";
import WalletAccountModal from "./WalletAccountModal";
import { Loader2, Wallet } from "lucide-react";

export default function ConnectWallet() {
    const { ready, authenticated, login, user } = usePrivy();
    const [open, setOpen] = useState(false);

    // Loading State
    if (!ready) {
        return (
            <Button disabled variant="outline" className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
            </Button>
        );
    }

    // Connected State
    if (authenticated && user?.wallet) {
        return (
            <>
                <Button
                    variant="outline"
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 transition-all"
                >
                    {/* Status Dot */}
                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />

                    <span className="font-mono text-sm">
                        {user.wallet.address.slice(0, 4)}...{user.wallet.address.slice(-4)}
                    </span>
                </Button>

                <WalletAccountModal open={open} onClose={() => setOpen(false)} />
            </>
        );
    }

    // Disconnected State
    return (
        <Button
            onClick={login}
            className="gap-2 font-semibold shadow-lg shadow-blue-500/20"
        >
            <Wallet className="h-4 w-4" />
            Connect Wallet
        </Button>
    );
}