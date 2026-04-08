"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Check, Copy, ExternalLink, UserCircle2, Loader2, RefreshCw,
    ArrowUpRight, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
    usePrivy,
    WalletWithMetadata,
} from "@privy-io/react-auth";
import { useFundWallet, useWallets } from "@privy-io/react-auth/solana";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SOLANA_NETWORK, SOLANA_RPC_URL } from "@/config/env";
import {
    getWalletNetworkIcon,
    getWalletNetworkLabel,
    getWalletTokenIcon,
    getWalletTokenLabel,
} from "@/config/walletAccountModal";
import { getWalletBalanceLabel } from "@/lib/walletAccountModal";
import {
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    isValidSolanaAddress,
    createPrivyWalletAdapter,
} from "@/lib/solana";

export default function WalletAccountModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { user, logout } = usePrivy();
    const { fundWallet } = useFundWallet();
    const { wallets: solanaWallets } = useWallets();

    const [copied, setCopied] = useState<string | null>(null);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isFunding, setIsFunding] = useState(false);
    const [balances, setBalances] = useState<Record<string, string>>({});
    const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});

    // ── Withdraw state ───────────────────────────────────────────────
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawAddress, setWithdrawAddress] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

    const connection = useMemo(() => new Connection(SOLANA_RPC_URL, "confirmed"), []);

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

    const fundingWallet = useMemo(() => {
        if (!wallets.length) return undefined;

        if (primaryWallet?.chainType === "solana") {
            return primaryWallet;
        }

        return wallets.find((wallet) => wallet.chainType === "solana");
    }, [wallets, primaryWallet]);

    // The Privy Solana embedded wallet (for signing withdraw transactions)
    const privySolanaWallet = useMemo(() => {
        return (
            solanaWallets.find((w) => {
                const name = w.standardWallet?.name?.toLowerCase() ?? "";
                return (
                    (name === "privy" || name.includes("privy")) &&
                    isValidSolanaAddress(w.address)
                );
            }) ?? null
        );
    }, [solanaWallets]);

    // Current SOL balance (numeric) for the Solana wallet
    const solWalletBalance = useMemo(() => {
        const solanaWallet = wallets.find((w) => w.chainType === "solana");
        if (!solanaWallet) return 0;
        const raw = balances[solanaWallet.address];
        if (!raw || raw === "--") return 0;
        const num = parseFloat(raw.split(" ")[0].replace(/,/g, ""));
        return isNaN(num) ? 0 : num;
    }, [wallets, balances]);

    const shorten = (addr?: string) => addr ? `${addr.slice(0, 5)}...${addr.slice(-5)}` : "";

    const refreshSingleWalletBalance = async (wallet: WalletWithMetadata) => {
        setLoadingBalances((prev) => ({ ...prev, [wallet.address]: true }));

        const nextBalance = await getWalletBalanceLabel(wallet.address, wallet.chainType);

        setBalances((prev) => ({
            ...prev,
            [wallet.address]: nextBalance,
        }));

        setLoadingBalances((prev) => ({ ...prev, [wallet.address]: false }));
    };

    const refreshAllBalances = useCallback(async () => {
        if (wallets.length === 0) return;

        const loadingState = Object.fromEntries(
            wallets.map((wallet) => [wallet.address, true]),
        ) as Record<string, boolean>;
        setLoadingBalances(loadingState);

        const nextBalances = await Promise.all(
            wallets.map(async (wallet) => {
                const balanceLabel = await getWalletBalanceLabel(
                    wallet.address,
                    wallet.chainType,
                );
                return [wallet.address, balanceLabel] as const;
            }),
        );

        setBalances((prev) => ({
            ...prev,
            ...Object.fromEntries(nextBalances),
        }));

        setLoadingBalances(
            Object.fromEntries(
                wallets.map((wallet) => [wallet.address, false]),
            ) as Record<string, boolean>,
        );
    }, [wallets]);

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
                    const balanceLabel = await getWalletBalanceLabel(
                        wallet.address,
                        wallet.chainType,
                    );
                    return [wallet.address, balanceLabel] as const;
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

    // Reset withdraw form when modal closes
    useEffect(() => {
        if (!open) {
            setShowWithdraw(false);
            setWithdrawAddress("");
            setWithdrawAmount("");
            setWithdrawError(null);
            setWithdrawSuccess(null);
        }
    }, [open]);

    const handleFundWallet = async (wallet?: WalletWithMetadata) => {
        if (!wallet || wallet.chainType !== "solana") return;

        setIsFunding(true);

        try {
            const solanaChain =
                SOLANA_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet";

            await fundWallet({
                address: wallet.address,
                options: {
                    chain: solanaChain,
                    amount: "1",
                    asset: "native-currency",
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

    // ── Withdraw handler ─────────────────────────────────────────────
    const handleWithdraw = async () => {
        setWithdrawError(null);
        setWithdrawSuccess(null);

        // Validation
        if (!privySolanaWallet) {
            setWithdrawError("No Privy Solana wallet found.");
            return;
        }

        if (!withdrawAddress.trim()) {
            setWithdrawError("Please enter a recipient address.");
            return;
        }

        if (!isValidSolanaAddress(withdrawAddress.trim())) {
            setWithdrawError("Invalid Solana address.");
            return;
        }

        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setWithdrawError("Please enter a valid amount.");
            return;
        }

        // Reserve ~0.005 SOL for tx fee + rent
        const FEE_RESERVE = 0.005;
        if (amount > solWalletBalance - FEE_RESERVE) {
            setWithdrawError(
                `Insufficient balance. Max withdrawable: ${Math.max(0, solWalletBalance - FEE_RESERVE).toFixed(4)} SOL`,
            );
            return;
        }

        setIsWithdrawing(true);

        try {
            const fromPubkey = new PublicKey(privySolanaWallet.address);
            const toPubkey = new PublicKey(withdrawAddress.trim());
            const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

            // Build the transfer transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports,
                }),
            );

            const { blockhash, lastValidBlockHeight } =
                await connection.getLatestBlockhash("confirmed");
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubkey;

            // Sign using the same Privy wallet adapter pattern used across the codebase
            const chainPrefix =
                SOLANA_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet";
            const adapter = createPrivyWalletAdapter(privySolanaWallet, chainPrefix);
            const signedTx = await adapter.signTransaction(transaction);

            // Send the signed transaction
            const txSig = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: "confirmed",
            });

            // Confirm the transaction
            const confirmation = await connection.confirmTransaction(
                { signature: txSig, blockhash, lastValidBlockHeight },
                "confirmed",
            );

            if (confirmation.value.err) {
                throw new Error(
                    `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
                );
            }

            setWithdrawSuccess(txSig);
            setWithdrawAddress("");
            setWithdrawAmount("");

            // Refresh balances after successful withdrawal
            await refreshAllBalances();
        } catch (err) {
            console.error("Withdraw failed:", err);
            const message =
                err instanceof Error ? err.message : "Withdrawal failed. Please try again.";
            setWithdrawError(message);
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handleMaxWithdraw = () => {
        const FEE_RESERVE = 0.005;
        const maxAmount = Math.max(0, solWalletBalance - FEE_RESERVE);
        setWithdrawAmount(maxAmount > 0 ? maxAmount.toFixed(6) : "0");
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="border border-zinc-800 p-8 shadow-2xl gap-0 max-h-[90vh] overflow-y-auto"
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

                {/* ── Withdraw Section ──────────────────────────────────── */}
                {fundingWallet && (
                    <div className="mt-4">
                        <button
                            onClick={() => {
                                setShowWithdraw((prev) => !prev);
                                setWithdrawError(null);
                                setWithdrawSuccess(null);
                            }}
                            className="flex w-full items-center justify-between rounded-lg
                                border border-zinc-800 px-4 py-2.5 text-sm font-mono
                                text-zinc-300 hover:bg-zinc-900/50 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <ArrowUpRight size={16} className="text-[#A3E635]" />
                                Withdraw SOL
                            </span>
                            {showWithdraw ? (
                                <ChevronUp size={16} className="text-zinc-500" />
                            ) : (
                                <ChevronDown size={16} className="text-zinc-500" />
                            )}
                        </button>

                        <div
                            className={cn(
                                "overflow-hidden transition-all duration-300 ease-in-out",
                                showWithdraw ? "max-h-[400px] opacity-100 mt-3" : "max-h-0 opacity-0",
                            )}
                        >
                            <div className="space-y-3 rounded-xl border border-zinc-800 p-4">
                                {/* Recipient address */}
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1.5 font-mono">
                                        Recipient Address
                                    </label>
                                    <Input
                                        placeholder="Enter Solana wallet address"
                                        value={withdrawAddress}
                                        onChange={(e) => {
                                            setWithdrawAddress(e.target.value);
                                            setWithdrawError(null);
                                            setWithdrawSuccess(null);
                                        }}
                                        disabled={isWithdrawing}
                                        className="font-mono text-sm bg-zinc-900/50 border-zinc-700
                                            focus-visible:border-[#A3E635]/50 focus-visible:ring-[#A3E635]/20"
                                    />
                                </div>

                                {/* Amount with MAX button */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs text-zinc-400 font-mono">
                                            Amount (SOL)
                                        </label>
                                        <button
                                            onClick={handleMaxWithdraw}
                                            disabled={isWithdrawing}
                                            className="text-xs font-mono text-[#A3E635] hover:text-[#B4F050]
                                                transition-colors disabled:opacity-50"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        step="0.001"
                                        min="0"
                                        value={withdrawAmount}
                                        onChange={(e) => {
                                            setWithdrawAmount(e.target.value);
                                            setWithdrawError(null);
                                            setWithdrawSuccess(null);
                                        }}
                                        disabled={isWithdrawing}
                                        className="font-mono text-sm bg-zinc-900/50 border-zinc-700
                                            focus-visible:border-[#A3E635]/50 focus-visible:ring-[#A3E635]/20"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1 font-mono">
                                        Available: {solWalletBalance.toFixed(4)} SOL
                                    </p>
                                </div>

                                {/* Error message */}
                                {withdrawError && (
                                    <div className="flex items-start gap-2 rounded-lg bg-red-950/30
                                        border border-red-800/40 px-3 py-2 text-xs text-red-400">
                                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                        <span className="break-all">{withdrawError}</span>
                                    </div>
                                )}

                                {/* Success message */}
                                {withdrawSuccess && (
                                    <div className="flex items-start gap-2 rounded-lg bg-emerald-950/30
                                        border border-emerald-800/40 px-3 py-2 text-xs text-emerald-400">
                                        <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                                        <span className="break-all">
                                            Withdrawal successful!{" "}
                                            <a
                                                href={`https://explorer.solana.com/tx/${withdrawSuccess}${SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : ""}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline hover:text-emerald-300 transition-colors"
                                            >
                                                View tx
                                            </a>
                                        </span>
                                    </div>
                                )}

                                {/* Withdraw button */}
                                <Button
                                    onClick={() => void handleWithdraw()}
                                    disabled={
                                        isWithdrawing ||
                                        !withdrawAddress.trim() ||
                                        !withdrawAmount ||
                                        parseFloat(withdrawAmount) <= 0
                                    }
                                    className="w-full bg-[#1A2E1A] text-[#A3E635]
                                        hover:bg-[#243E24] hover:text-[#B4F050]
                                        border border-[#A3E635]/20 font-ibm text-sm tracking-wide
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isWithdrawing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Withdrawing...
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUpRight className="h-4 w-4 mr-2" />
                                            Withdraw SOL
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Action */}
                <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => void handleFundWallet(fundingWallet)}
                            disabled={!fundingWallet || isFunding || isDisconnecting || isWithdrawing}
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
                                "Fund SOL"
                            )}
                        </Button>

                        <Button
                            onClick={handleDisconnect}
                            disabled={isDisconnecting || isFunding || isWithdrawing}
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
                </div>

            </DialogContent>
        </Dialog>
    );
}