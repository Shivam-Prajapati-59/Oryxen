"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, UserCircle2, Loader2, RefreshCw } from "lucide-react";
import {
    useFundWallet as useFundEthereumWallet,
    usePrivy,
    WalletWithMetadata,
} from "@privy-io/react-auth";
import { useFundWallet as useFundSolanaWallet } from "@privy-io/react-auth/solana";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CHAIN_ICONS } from "@/constants/chains";
import { cn } from "@/lib/utils";
import { SOLANA_NETWORK, SOLANA_RPC_URL } from "@/config/env";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Contract, JsonRpcProvider, formatUnits } from "ethers";

const ETHEREUM_RPC_URL =
    process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || "https://ethereum-rpc.publicnode.com";
const ETHEREUM_USDC_ADDRESS = "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const ERC20_BALANCE_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
] as const;
const TOKEN_ICONS: Record<string, string> = {
    SOL: CHAIN_ICONS.solana,
    USDC: "https://drift-public.s3.eu-central-1.amazonaws.com/assets/icons/markets/usdc.svg",
};

const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
const ethereumProvider = new JsonRpcProvider(ETHEREUM_RPC_URL);
const usdcContract = new Contract(
    ETHEREUM_USDC_ADDRESS,
    ERC20_BALANCE_ABI,
    ethereumProvider,
);

const formatBalance = (value: number) => {
    if (!Number.isFinite(value)) return "--";
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    }).format(value);
};

const getSolBalance = async (address: string) => {
    const publicKey = new PublicKey(address);
    const lamports = await solanaConnection.getBalance(publicKey);
    return lamports / LAMPORTS_PER_SOL;
};

const getEthereumUsdcBalance = async (address: string) => {
    const rawBalance = (await usdcContract.balanceOf(address)) as bigint;
    return Number(formatUnits(rawBalance, 6));
};

const getWalletTokenLabel = (chainType?: string) => {
    if (chainType === "solana") return "SOL";
    if (chainType === "ethereum") return "USDC";
    return "";
};

const getWalletTokenIcon = (chainType?: string) => {
    const token = getWalletTokenLabel(chainType);
    return TOKEN_ICONS[token] || CHAIN_ICONS.ethereum;
};

const getWalletNetworkLabel = (chainType?: string) => {
    if (chainType === "solana") return "Solana";
    if (chainType === "ethereum") return "Base";
    return chainType || "Unknown";
};

const getWalletNetworkIcon = (chainType?: string) => {
    if (chainType === "solana") return CHAIN_ICONS.solana;
    if (chainType === "ethereum") return CHAIN_ICONS.base;
    return CHAIN_ICONS.ethereum;
};

export default function WalletAccountModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { user, logout } = usePrivy();
    const { fundWallet: fundEthereumWallet } = useFundEthereumWallet();
    const { fundWallet: fundSolanaWallet } = useFundSolanaWallet();

    const [copied, setCopied] = useState<string | null>(null);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isFunding, setIsFunding] = useState(false);
    const [balances, setBalances] = useState<Record<string, string>>({});
    const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});

    const wallets = useMemo(
        () =>
            (user?.linkedAccounts ?? []).filter(
                (account): account is WalletWithMetadata =>
                    account.type === "wallet" &&
                    typeof account.walletClientType === "string" &&
                    account.walletClientType.startsWith("privy"),
            ),
        [user?.linkedAccounts],
    );

    const primaryWallet = useMemo(() => {
        if (!wallets.length) return undefined;
        const currentAddress = user?.wallet?.address;
        return wallets.find((wallet) => wallet.address === currentAddress) ?? wallets[0];
    }, [wallets, user?.wallet?.address]);

    const shorten = (addr?: string) => addr ? `${addr.slice(0, 5)}...${addr.slice(-5)}` : "";

    const refreshSingleWalletBalance = async (wallet: WalletWithMetadata) => {
        setLoadingBalances((prev) => ({ ...prev, [wallet.address]: true }));

        try {
            let nextBalance = "--";

            if (wallet.chainType === "solana") {
                const sol = await getSolBalance(wallet.address);
                nextBalance = `${formatBalance(sol)} SOL`;
            } else if (wallet.chainType === "ethereum") {
                const usdc = await getEthereumUsdcBalance(wallet.address);
                nextBalance = `${formatBalance(usdc)} USDC`;
            }

            setBalances((prev) => ({
                ...prev,
                [wallet.address]: nextBalance,
            }));
        } catch (error) {
            console.error("Failed to refresh wallet balance:", error);
            setBalances((prev) => ({
                ...prev,
                [wallet.address]: "--",
            }));
        } finally {
            setLoadingBalances((prev) => ({ ...prev, [wallet.address]: false }));
        }
    };

    const handleCopy = (address: string) => {
        void navigator.clipboard.writeText(address);
        setCopied(address);
        setTimeout(() => setCopied(null), 2000);
    };

    useEffect(() => {
        if (!open || wallets.length === 0) return;

        let cancelled = false;

        const loadBalances = async () => {
            const loadingState = Object.fromEntries(
                wallets.map((wallet) => [wallet.address, true]),
            ) as Record<string, boolean>;
            setLoadingBalances(loadingState);

            const nextBalances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        if (wallet.chainType === "solana") {
                            const sol = await getSolBalance(wallet.address);
                            return [wallet.address, `${formatBalance(sol)} SOL`] as const;
                        }

                        if (wallet.chainType === "ethereum") {
                            const usdc = await getEthereumUsdcBalance(wallet.address);
                            return [wallet.address, `${formatBalance(usdc)} USDC`] as const;
                        }

                        return [wallet.address, "--"] as const;
                    } catch (error) {
                        console.error("Failed to fetch wallet balance:", error);
                        return [wallet.address, "--"] as const;
                    }
                }),
            );

            if (cancelled) return;

            setBalances((prev) => ({
                ...prev,
                ...Object.fromEntries(nextBalances),
            }));

            setLoadingBalances(
                Object.fromEntries(
                    wallets.map((wallet) => [wallet.address, false]),
                ) as Record<string, boolean>,
            );
        };

        void loadBalances();

        return () => {
            cancelled = true;
        };
    }, [open, wallets]);

    const handleFundWallet = async (wallet?: WalletWithMetadata) => {
        if (!wallet) return;

        setIsFunding(true);

        try {
            if (wallet.chainType === "solana") {
                const solanaChain =
                    SOLANA_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet";

                await fundSolanaWallet({
                    address: wallet.address,
                    options: {
                        chain: solanaChain,
                        amount: "1",
                        asset: "native-currency",
                    },
                });
                return;
            }

            await fundEthereumWallet({
                address: wallet.address,
                options: {
                    amount: "50",
                    asset: "USDC",
                },
            });
        } catch (error) {
            console.error("Failed to open funding flow:", error);
        } finally {
            setIsFunding(false);
        }
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
                    {wallets.length === 0 && (
                        <div className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-400">
                            No embedded Privy wallets found.
                        </div>
                    )}

                    {wallets.map((wallet) => {
                        const rawBalance = balances[wallet.address] || "--";
                        const amountPart = rawBalance === "--" ? "--" : rawBalance.split(" ")[0];
                        const tokenLabel = getWalletTokenLabel(wallet.chainType);

                        return (
                            <div
                                key={wallet.address}
                                className="space-y-3 rounded-xl border p-4"
                            >
                                {/* Balance + Network structure */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src={getWalletTokenIcon(wallet.chainType)}
                                            alt={`${tokenLabel || 'token'} logo`}
                                            width={24}
                                            height={24}
                                            className="rounded-full"
                                        />
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-mono text-base">{amountPart}</span>
                                            <span className="text-sm">{tokenLabel}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <Image
                                                src={getWalletNetworkIcon(wallet.chainType)}
                                                alt={`${getWalletNetworkLabel(wallet.chainType)} logo`}
                                                width={16}
                                                height={16}
                                                className="rounded-full"
                                            />
                                            <span className="text-sm">
                                                {getWalletNetworkLabel(wallet.chainType)}
                                            </span>
                                        </div>

                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => void refreshSingleWalletBalance(wallet)}
                                        >
                                            {loadingBalances[wallet.address] ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <RefreshCw size={14} />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Address + Actions structure */}
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-mono text-sm tracking-wide">
                                        {shorten(wallet.address)}
                                    </p>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="relative h-7 w-7"
                                            onClick={() => handleCopy(wallet.address)}
                                        >
                                            <Copy
                                                size={14}
                                                className={cn(
                                                    "absolute transition-all duration-200",
                                                    copied === wallet.address
                                                        ? "scale-0 opacity-0"
                                                        : "scale-100 opacity-100"
                                                )}
                                            />

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
                                            className="h-7 w-7"
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
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Action */}
                <div className="mt-6 flex gap-3">
                    <Button
                        onClick={() => void handleFundWallet(primaryWallet)}
                        disabled={!primaryWallet || isFunding || isDisconnecting}
                        className="flex-1 bg-[#1A2E1A] text-[#A3E635]
                                hover:bg-[#243E24] hover:text-[#B4F050]
                                border border-[#A3E635]/20  font-ibm text-md tracking-wide
                                disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFunding ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Funding...
                            </>
                        ) : (
                            `Fund ${primaryWallet?.chainType === "solana" ? "SOL" : "USDC"}`
                        )}
                    </Button>

                    <Button
                        onClick={handleDisconnect}
                        disabled={isDisconnecting || isFunding}
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