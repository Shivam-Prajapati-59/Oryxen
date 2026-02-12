"use client";

import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    KeyRound,
} from "lucide-react";
import { usePacifica, PACIFICA_SYMBOLS } from "@/features/pacifica";
import type { OrderSide } from "@/features/pacifica";

const DemoPacifica = () => {
    const { authenticated, login, ready } = usePrivy();

    // Order form state
    const [symbol, setSymbol] = useState<string>("BTC");
    const [amount, setAmount] = useState<string>("0.1");
    const [side, setSide] = useState<OrderSide>("bid");
    const [slippage, setSlippage] = useState<string>("0.5");

    // Hook
    const {
        solanaWallet,
        agentWallet,
        isBindingAgent,
        isPlacingOrder,
        bindError,
        orderError,
        lastOrderResult,
        lastBindResult,
        bindAgentWallet,
        placeMarketOrder,
        isReady,
        isAgentBound,
    } = usePacifica();

    // ─── Handlers ────────────────────────────────────────────────────────
    const handleBindAgent = async () => {
        await bindAgentWallet();
    };

    const handlePlaceOrder = async () => {
        await placeMarketOrder({
            symbol,
            amount,
            side,
            slippagePercent: slippage,
            reduceOnly: false,
        });
    };

    // ─── Loading ─────────────────────────────────────────────────────────
    if (!ready) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">
                    Loading Privy SDK...
                </span>
            </div>
        );
    }

    // ─── Not Authenticated ──────────────────────────────────────────────
    if (!authenticated) {
        return (
            <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-lg">
                <h2 className="text-xl font-bold">Pacifica Demo – Market Orders</h2>
                <p className="text-muted-foreground">
                    Connect your Solana wallet to test placing market orders on Pacifica.
                </p>
                <Button onClick={login} size="lg" className="w-full">
                    Connect Wallet
                </Button>
            </div>
        );
    }

    // ─── Main UI ─────────────────────────────────────────────────────────
    return (
        <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-lg">
            <h2 className="text-xl font-bold">Pacifica Demo – Market Orders</h2>

            {/* ── Wallet Info ─────────────────────────────────────────────── */}
            <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Wallet
                </h3>
                {solanaWallet ? (
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <code className="text-xs">
                            {solanaWallet.address}
                        </code>
                    </div>
                ) : (
                    <p className="text-sm text-destructive">
                        No Solana wallet found. Make sure you have a Solana wallet linked in
                        Privy.
                    </p>
                )}
            </div>

            {/* ── Step 1: Bind Agent Wallet ───────────────────────────────── */}
            <div className="rounded-lg border p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    <KeyRound className="h-4 w-4" />
                    Step 1 – Bind Agent Wallet
                </h3>
                <p className="text-xs text-muted-foreground">
                    Generate an agent keypair and bind it to your account. The agent signs
                    orders on your behalf without exposing your main wallet key.
                </p>

                {isAgentBound ? (
                    <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <div className="space-y-0.5 overflow-hidden">
                            <p className="text-sm font-medium">Agent wallet bound!</p>
                            <code className="block truncate text-xs opacity-80">
                                {agentWallet?.publicKey}
                            </code>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={handleBindAgent}
                        disabled={isBindingAgent || !isReady}
                        className="w-full"
                        variant="outline"
                    >
                        {isBindingAgent ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Binding Agent Wallet...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Bind Agent Wallet
                            </>
                        )}
                    </Button>
                )}

                {bindError && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {bindError}
                    </div>
                )}

                {lastBindResult && (
                    <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2 text-xs">
                        {JSON.stringify(lastBindResult, null, 2)}
                    </pre>
                )}
            </div>

            {/* ── Step 2: Place Market Order ──────────────────────────────── */}
            <div className="rounded-lg border p-4 space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    <TrendingUp className="h-4 w-4" />
                    Step 2 – Place Market Order
                </h3>

                {/* Symbol select */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Symbol
                    </label>
                    <select
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                        {PACIFICA_SYMBOLS.map((s) => (
                            <option key={s.symbol} value={s.symbol}>
                                {s.symbol} – {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Amount
                    </label>
                    <Input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.1"
                    />
                </div>

                {/* Slippage */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Slippage (%)
                    </label>
                    <Input
                        type="text"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        placeholder="0.5"
                    />
                </div>

                {/* Side */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                        Side
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant={side === "bid" ? "default" : "outline"}
                            onClick={() => setSide("bid")}
                            className={
                                side === "bid"
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : ""
                            }
                        >
                            <TrendingUp className="mr-1 h-4 w-4" />
                            Buy / Long
                        </Button>
                        <Button
                            variant={side === "ask" ? "default" : "outline"}
                            onClick={() => setSide("ask")}
                            className={
                                side === "ask"
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : ""
                            }
                        >
                            <TrendingDown className="mr-1 h-4 w-4" />
                            Sell / Short
                        </Button>
                    </div>
                </div>

                {/* Submit */}
                <Button
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder || !isAgentBound}
                    className="w-full"
                >
                    {isPlacingOrder ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Placing Order...
                        </>
                    ) : (
                        `Place ${side === "bid" ? "Buy" : "Sell"} Market Order`
                    )}
                </Button>

                {!isAgentBound && (
                    <p className="text-center text-xs text-muted-foreground">
                        ⚠ Bind an agent wallet first (Step 1)
                    </p>
                )}

                {orderError && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {orderError}
                    </div>
                )}

                {lastOrderResult && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Order placed successfully!
                        </div>
                        <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2 text-xs">
                            {JSON.stringify(lastOrderResult, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoPacifica;