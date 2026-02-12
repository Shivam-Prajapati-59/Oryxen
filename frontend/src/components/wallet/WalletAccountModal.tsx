"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, UserCircle2, Loader2 } from "lucide-react";
import { usePrivy, WalletWithMetadata } from "@privy-io/react-auth";
import { useState } from "react";
import Image from "next/image";
import { CHAIN_ICONS } from "@/constants/chains";
import { cn } from "@/lib/utils";

// --- Visual Assets to match the screenshot ---
const MetamaskIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 mr-1.5" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#F6851B" /></svg>
);
const PrivyIcon = () => (
    <div className="h-4 w-4 mr-1.5 rounded-full bg-white flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-black" /></div>
);

export default function WalletAccountModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { user, exportWallet, logout } = usePrivy();
    const [copied, setCopied] = useState<string | null>(null);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const wallets = user?.linkedAccounts?.filter((a) => a.type === "wallet") ?? [];
    const primaryWallet = user?.wallet;

    const shorten = (addr?: string) => addr ? `${addr.slice(0, 5)}...${addr.slice(-5)}` : "";

    const handleCopy = (address: string) => {
        console.log(wallets, user);

        navigator.clipboard.writeText(address);
        setCopied(address);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            await logout();
            onClose();
        } catch (error) {
            console.error("Failed to disconnect:", error);
        } finally {
            setIsDisconnecting(false);
        }
    };

    const getChainIcon = (chainType?: string) => {
        if (!chainType) return CHAIN_ICONS.ethereum;
        return CHAIN_ICONS[chainType.toLowerCase()] || CHAIN_ICONS.ethereum;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="border border-zinc-800 p-8 shadow-2xl gap-0"
                showCloseButton={false}>
                <DialogTitle className="sr-only">Account Details</DialogTitle>

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-mono">Account</h2>
                    <div className="flex items-center gap-2 font-mono text-sm">
                        <UserCircle2 size={18} />
                        {shorten(primaryWallet?.address)}
                    </div>
                </div>

                {/* Wallet List */}
                <div className="space-y-3">
                    {wallets.map((wallet) => {
                        const isPrivy = wallet.walletClientType === "privy";

                        return (
                            <div
                                key={wallet.address}
                                className="group relative flex items-center justify-between rounded-xl border border-zinc-800 p-4 transition-colors hover:border-zinc-700"
                            >
                                {/* Left Side: Icon & Details */}
                                <div className="flex items-center gap-4">
                                    {/* Chain Logo */}
                                    <Image
                                        src={getChainIcon(wallet.chainType)}
                                        alt={`${wallet.chainType || 'chain'} logo`}
                                        width={32}
                                        height={32}
                                        className="rounded-full"
                                    />
                                    {/* Wallet Info */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center text-xs font-medium">
                                            {isPrivy ? <PrivyIcon /> : <MetamaskIcon />}
                                            <span>{isPrivy ? "Privy" : "Metamask"}</span>
                                        </div>
                                        <p className="font-mono text-sm tracking-wide">
                                            {shorten(wallet.address)}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="relative h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800"
                                            onClick={() => handleCopy(wallet.address)}
                                        >
                                            {/* Copy icon */}
                                            <Copy
                                                size={14}
                                                className={cn(
                                                    "absolute transition-all duration-200",
                                                    copied === wallet.address
                                                        ? "scale-0 opacity-0"
                                                        : "scale-100 opacity-100"
                                                )}
                                            />

                                            {/* Check icon */}
                                            <Check
                                                size={14}
                                                className={cn(
                                                    "absolute transition-all duration-200",
                                                    copied === wallet.address
                                                        ? "scale-100 opacity-100"
                                                        : "scale-0 opacity-0"
                                                )}
                                            />
                                        </Button>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800"
                                            onClick={() => {
                                                const isSolana = wallet.chainType === "solana";

                                                const explorerUrl = isSolana
                                                    ? `https://explorer.solana.com/address/${wallet.address}`
                                                    : `https://etherscan.io/address/${wallet.address}`;

                                                window.open(explorerUrl, "_blank");
                                            }}
                                        >
                                            <ExternalLink size={14} />
                                        </Button>

                                    </div>

                                    {/* Export Button (Conditional) */}
                                    {isPrivy && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => exportWallet()}
                                            className="h-5 px-2 text-[10px] uppercase font-bold tracking-wider text-[#a8e93f] hover:text-[#a8e93f] bg-[#A3E635]/10 hover:bg-[#A3E635]/20 rounded-sm"
                                        >
                                            Export
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Action */}
                <div className="mt-6 flex gap-3">
                    <Button
                        className="flex-1 bg-[#1A2E1A] text-[#A3E635]
                                hover:bg-[#243E24] hover:text-[#B4F050]
                                border border-[#A3E635]/20  font-ibm text-md tracking-wide"
                    >
                        Fund Wallet
                    </Button>

                    <Button
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                        className="flex-1 bg-[#1A2E1A] text-[#A3E635]
                                hover:bg-[#243E24] hover:text-[#B4F050]
                                border border-[#A3E635]/20 font-ibm text-md tracking-wide
                                disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDisconnecting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Disconnecting...
                            </>
                        ) : (
                            "Disconnect"
                        )}
                    </Button>
                </div>


            </DialogContent>
        </Dialog>
    );
}