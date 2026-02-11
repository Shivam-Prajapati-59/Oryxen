"use client";

import React, { useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PublicKey } from "@solana/web3.js";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    X,
    Coins,
} from "lucide-react";
import { useJupiterPerps } from "@/hooks/protocols/useJupiterPerps";
import { BNToUSDRepresentation } from "@/utils/jupiter";

// ─── Constants ──────────────────────────────────────────────────────
const TARGET_TOKENS = ["SOL", "BTC", "ETH"] as const;
const COLLATERAL_TOKENS = ["SOL", "USDC", "USDT"] as const;
const LEVERAGE_OPTIONS = [1.1, 2, 3, 5, 10, 20];
const RECEIVE_TOKENS = ["SOL", "USDC", "USDT"] as const;

// ─── Component ──────────────────────────────────────────────────────
const DemoJupiter = () => {
    const { authenticated, login, ready } = usePrivy();

    // Order form state
    const [targetToken, setTargetToken] = useState<string>("SOL");
    const [collateralToken, setCollateralToken] = useState<string>("SOL");
    const [direction, setDirection] = useState<"long" | "short">("long");
    const [collateralAmount, setCollateralAmount] = useState<string>("0.1");
    const [leverage, setLeverage] = useState<number>(1.1);
    const [closeReceiveMint, setCloseReceiveMint] = useState<string>("SOL");

    // Hook
    const {
        isInitialized,
        isLoading,
        error,
        isTrading,
        tradeError,
        lastTradeResult,
        positions,
        custodies,
        config,
        privyWallet,
        initialize,
        disconnect,
        fetchPositions,
        fetchCustodies,
        openPosition,
        closePosition,
    } = useJupiterPerps();

    // Derived: notional size in USD (rough estimate, user should know the price)
    const sizeUsd = useMemo(() => {
        const amt = parseFloat(collateralAmount) || 0;
        return amt * leverage;
    }, [collateralAmount, leverage]);

    // ─── Handlers ─────────────────────────────────────────────────────
    const handleInitialize = async () => {
        await initialize();
    };

    const handleFetchAll = async () => {
        await Promise.all([fetchPositions(), fetchCustodies()]);
    };

    const handleOpenPosition = async () => {
        const amt = parseFloat(collateralAmount);
        if (isNaN(amt) || amt <= 0) {
            alert("Enter a valid collateral amount");
            return;
        }

        await openPosition({
            targetSymbol: targetToken,
            collateralSymbol: collateralToken,
            side: direction,
            sizeUsd: sizeUsd, // notional size in USD
            collateralAmount: amt,
            leverageMultiplier: leverage,
        });
    };

    const handleClosePosition = async (positionPubkey: PublicKey) => {
        await closePosition({
            positionPubkey,
            desiredMintSymbol: closeReceiveMint,
        });
    };

    // ─── Loading ──────────────────────────────────────────────────────
    if (!ready) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading Privy SDK...</span>
            </div>
        );
    }

    // ─── Not Authenticated ────────────────────────────────────────────
    if (!authenticated) {
        return (
            <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-lg">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Jupiter Perpetuals Demo
                </h2>
                <p className="text-muted-foreground">
                    Connect your Solana wallet to test Jupiter Perpetuals on-chain
                    functions — positions, funding rates, and market trades.
                </p>
                <Button onClick={login} size="lg" className="w-full">
                    Connect Wallet
                </Button>
            </div>
        );
    }

    // ─── Main UI ──────────────────────────────────────────────────────
    return (
        <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-lg">
            {/* Header */}
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Jupiter Perpetuals Demo
                <span className="ml-auto text-xs font-normal text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                    {config.cluster}
                </span>
            </h2>

            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                Jupiter Perpetuals program lives on <strong>mainnet-beta</strong>. All
                on-chain reads (positions, custodies, funding rates) pull live mainnet
                data. Trade construction &amp; signing works end-to-end but requires
                real SOL for fees.
            </p>

            {/* ── Wallet Info ──────────────────────────────────────────── */}
            <div className="rounded-lg border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Wallet
                </h3>
                {privyWallet ? (
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <code className="text-xs break-all">{privyWallet.address}</code>
                    </div>
                ) : (
                    <p className="text-sm text-destructive">
                        No Solana wallet found. Make sure you have a Solana wallet linked in
                        Privy.
                    </p>
                )}
            </div>

            {/* ── Step 1: Initialize Client ────────────────────────────── */}
            <div className="rounded-lg border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Step 1 — Initialize Client
                </h3>
                <p className="text-xs text-muted-foreground">
                    Creates an Anchor <code className="text-xs">Program</code> instance
                    connected to the Jupiter Perpetuals on-chain program.
                </p>

                {isInitialized ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Client ready
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleFetchAll}>
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Refresh Data
                            </Button>
                            <Button variant="outline" size="sm" onClick={disconnect}>
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={handleInitialize}
                        disabled={isLoading || !privyWallet}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Initializing...
                            </>
                        ) : (
                            "Initialize Jupiter Perps Client"
                        )}
                    </Button>
                )}

                {error && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* ── Custodies / Funding Rates ────────────────────────────── */}
            {isInitialized && (
                <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Custodies &amp; Borrow Rates
                        </h3>
                        <Button variant="ghost" size="sm" onClick={fetchCustodies}>
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                    </div>

                    {custodies.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            Click <strong>Refresh Data</strong> above to load custody info.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {custodies.map((c) => (
                                <div
                                    key={c.publicKey.toString()}
                                    className="flex items-center justify-between rounded-md bg-muted p-2 text-xs"
                                >
                                    <div>
                                        <span className="font-semibold">{c.symbol}</span>
                                        <span className="ml-2 text-muted-foreground truncate max-w-[120px] inline-block align-middle">
                                            {c.publicKey.toString().slice(0, 8)}…
                                        </span>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                        <div>
                                            Borrow APR:{" "}
                                            <span className="font-mono">{c.borrowApr.toFixed(2)}%</span>
                                        </div>
                                        <div className="text-muted-foreground">
                                            Hourly:{" "}
                                            <span className="font-mono">{c.hourlyBorrowRate}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Open Positions ───────────────────────────────────────── */}
            {isInitialized && (
                <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Open Positions
                        </h3>
                        <Button variant="ghost" size="sm" onClick={fetchPositions}>
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                    </div>

                    {positions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            No open positions found for this wallet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {positions.map((pos) => {
                                const side = (pos.account.side as any)?.long
                                    ? "LONG"
                                    : "SHORT";
                                const sizeUsdStr = BNToUSDRepresentation(
                                    pos.account.sizeUsd,
                                    6,
                                    2,
                                );
                                const collateralStr = BNToUSDRepresentation(
                                    pos.account.collateralUsd,
                                    6,
                                    2,
                                );

                                return (
                                    <div
                                        key={pos.publicKey.toString()}
                                        className="rounded-md border p-3 space-y-2"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <span
                                                className={`font-bold ${side === "LONG" ? "text-green-600" : "text-red-600"
                                                    }`}
                                            >
                                                {side}
                                            </span>
                                            <code className="text-muted-foreground">
                                                {pos.publicKey.toString().slice(0, 12)}…
                                            </code>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 text-xs">
                                            <div>
                                                <span className="text-muted-foreground">Size: </span>$
                                                {sizeUsdStr}
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">
                                                    Collateral:{" "}
                                                </span>
                                                ${collateralStr}
                                            </div>
                                        </div>

                                        {/* Close controls */}
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={closeReceiveMint}
                                                onChange={(e) => setCloseReceiveMint(e.target.value)}
                                                className="rounded-md border bg-background px-2 py-1 text-xs"
                                            >
                                                {RECEIVE_TOKENS.map((t) => (
                                                    <option key={t} value={t}>
                                                        Receive {t}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={isTrading}
                                                onClick={() => handleClosePosition(pos.publicKey)}
                                            >
                                                {isTrading ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <>
                                                        <X className="mr-1 h-3 w-3" />
                                                        Close
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 2: Open Position ────────────────────────────────── */}
            {isInitialized && (
                <div className="rounded-lg border p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Step 2 — Open Position
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Constructs a <code className="text-xs">createIncreasePositionMarketRequest</code>{" "}
                        transaction, simulates it on-chain, then signs &amp; sends via Privy.
                    </p>

                    {/* Direction */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                            Direction
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant={direction === "long" ? "default" : "outline"}
                                size="sm"
                                className={
                                    direction === "long"
                                        ? "flex-1 bg-green-600 hover:bg-green-700"
                                        : "flex-1"
                                }
                                onClick={() => setDirection("long")}
                            >
                                <TrendingUp className="mr-1 h-4 w-4" />
                                Long
                            </Button>
                            <Button
                                variant={direction === "short" ? "default" : "outline"}
                                size="sm"
                                className={
                                    direction === "short"
                                        ? "flex-1 bg-red-600 hover:bg-red-700"
                                        : "flex-1"
                                }
                                onClick={() => setDirection("short")}
                            >
                                <TrendingDown className="mr-1 h-4 w-4" />
                                Short
                            </Button>
                        </div>
                    </div>

                    {/* Target Market */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                            Target Market
                        </label>
                        <div className="flex gap-2">
                            {TARGET_TOKENS.map((t) => (
                                <Button
                                    key={t}
                                    variant={targetToken === t ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setTargetToken(t)}
                                >
                                    {t}-PERP
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Collateral Token */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                            Collateral Token
                        </label>
                        <div className="flex gap-2">
                            {COLLATERAL_TOKENS.map((t) => (
                                <Button
                                    key={t}
                                    variant={collateralToken === t ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCollateralToken(t)}
                                >
                                    {t}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                            Collateral Amount ({collateralToken})
                        </label>
                        <Input
                            type="text"
                            value={collateralAmount}
                            onChange={(e) => setCollateralAmount(e.target.value)}
                            placeholder={`e.g. 0.1 ${collateralToken}`}
                        />
                    </div>

                    {/* Leverage */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                            Leverage: {leverage}x
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {LEVERAGE_OPTIONS.map((l) => (
                                <Button
                                    key={l}
                                    variant={leverage === l ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setLeverage(l)}
                                >
                                    {l}x
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Trade Summary */}
                    <div className="rounded-md bg-muted p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Direction</span>
                            <span
                                className={
                                    direction === "long" ? "text-green-600" : "text-red-600"
                                }
                            >
                                {direction.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Market</span>
                            <span>{targetToken}-PERP</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Collateral</span>
                            <span>
                                {collateralAmount} {collateralToken}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Leverage</span>
                            <span>{leverage}x</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">~Notional Size</span>
                            <span>${sizeUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Slippage</span>
                            <span>3%</span>
                        </div>
                    </div>

                    {/* Open Position Button */}
                    <Button
                        onClick={handleOpenPosition}
                        disabled={
                            isTrading ||
                            !collateralAmount ||
                            isNaN(parseFloat(collateralAmount)) ||
                            parseFloat(collateralAmount) <= 0
                        }
                        className={`w-full ${direction === "long"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                            }`}
                    >
                        {isTrading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Opening Position...
                            </>
                        ) : (
                            <>
                                {direction === "long" ? (
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                ) : (
                                    <TrendingDown className="mr-2 h-4 w-4" />
                                )}
                                Open {direction.toUpperCase()} {targetToken}
                            </>
                        )}
                    </Button>

                    {/* Trade Error */}
                    {tradeError && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            {tradeError}
                        </div>
                    )}

                    {/* Trade Success */}
                    {lastTradeResult?.success && (
                        <div className="flex items-start gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-medium">Transaction sent!</p>
                                {lastTradeResult.txSignature && (
                                    <a
                                        href={`https://explorer.solana.com/tx/${lastTradeResult.txSignature}?cluster=${config.cluster}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs underline break-all"
                                    >
                                        {lastTradeResult.txSignature}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DemoJupiter;