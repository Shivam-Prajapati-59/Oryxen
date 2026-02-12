"use client";

import React, { useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useFlash, FLASH_DEVNET_TOKENS } from "@/features/flash";
import type { TradeDirection } from "@/features/flash";

// Tradeable target tokens (non-stablecoin)
const TARGET_TOKENS = ["SOL", "BTC", "ETH"] as const;
// Collateral token
const COLLATERAL_TOKEN = "USDC";
// Input tokens users can deposit with
const INPUT_TOKENS = ["SOL", "USDC"] as const;
// Leverage presets
const LEVERAGE_OPTIONS = [1.1, 2, 3, 5, 10];
// Slippage presets (in BPS)
const SLIPPAGE_OPTIONS = [
  { label: "0.5%", value: 500 },
  { label: "0.8%", value: 800 },
  { label: "1%", value: 1000 },
  { label: "2%", value: 2000 },
];

const DemoFlash = () => {
  const { authenticated, login, ready } = usePrivy();

  // Order form state
  const [inputToken, setInputToken] = useState<string>("SOL");
  const [targetToken, setTargetToken] = useState<string>("SOL");
  const [inputAmount, setInputAmount] = useState<string>("0.1");
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [leverage, setLeverage] = useState<number>(1.1);
  const [slippageBps, setSlippageBps] = useState<number>(800);

  // Hook
  const {
    initialize,
    disconnect,
    openPosition,
    getPoolTokens,
    getMarkets,
    isInitialized,
    isLoading,
    error,
    isTrading,
    tradeError,
    lastTradeResult,
    privyWallet,
    config,
  } = useFlash();

  // Pool tokens once initialized
  const poolTokens = useMemo(() => {
    if (!isInitialized) return [];
    return getPoolTokens();
  }, [isInitialized, getPoolTokens]);

  // Handlers
  const handleInitialize = async () => {
    await initialize();
  };

  const handleOpenPosition = async () => {
    await openPosition({
      inputTokenSymbol: inputToken,
      targetTokenSymbol: targetToken,
      inputAmount,
      direction,
      leverage,
      slippageBps,
    });
  };

  // ─── Loading ───────────────────────────────────────────────────────
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

  // ─── Not Authenticated ────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="mx-auto max-w-lg space-y-6 rounded-xl border bg-card p-8 shadow-lg">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Flash Trade Demo
        </h2>
        <p className="text-muted-foreground">
          Connect your Solana wallet to test Flash Trade perpetual positions on
          devnet.
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
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Zap className="h-5 w-5" />
        Flash Trade Demo
        <span className="ml-auto text-xs font-normal text-muted-foreground rounded-full bg-muted px-2 py-0.5">
          {config.cluster}
        </span>
      </h2>

      {/* ── Wallet Info ───────────────────────────────────────────── */}
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

      {/* ── Step 1: Initialize Client ─────────────────────────────── */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Step 1 — Initialize Flash Client
        </h3>
        <p className="text-xs text-muted-foreground">
          Connects to Flash Trade&apos;s on-chain program, loads the{" "}
          <code className="text-xs">{config.poolName}</code> pool config, and
          prepares address lookup tables.
        </p>

        {isInitialized ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Client initialized ({config.poolName})
            </div>
            <Button variant="outline" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
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
              "Initialize Flash Client"
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

      {/* ── Pool Tokens ───────────────────────────────────────────── */}
      {isInitialized && poolTokens.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pool Tokens ({config.poolName})
          </h3>
          <div className="flex flex-wrap gap-2">
            {poolTokens.map((t) => (
              <span
                key={t.symbol}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
              >
                {t.symbol}{" "}
                <span className="text-muted-foreground">
                  ({t.decimals}d)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Open Position ─────────────────────────────────── */}
      {isInitialized && (
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Step 2 — Open Position (Swap & Open)
          </h3>
          <p className="text-xs text-muted-foreground">
            Deposits your input token, swaps to USDC collateral, and opens a
            perpetual position on the target market.
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

          {/* Input Token */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Input Token
            </label>
            <div className="flex gap-2">
              {INPUT_TOKENS.map((t) => (
                <Button
                  key={t}
                  variant={inputToken === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputToken(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Target Token */}
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
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Amount ({inputToken})
            </label>
            <Input
              type="text"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder={`e.g. 0.1 ${inputToken}`}
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

          {/* Slippage */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Max Slippage
            </label>
            <div className="flex gap-2 flex-wrap">
              {SLIPPAGE_OPTIONS.map((s) => (
                <Button
                  key={s.value}
                  variant={slippageBps === s.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlippageBps(s.value)}
                >
                  {s.label}
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
              <span className="text-muted-foreground">Input</span>
              <span>
                {inputAmount} {inputToken}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target</span>
              <span>{targetToken}-PERP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collateral</span>
              <span>{COLLATERAL_TOKEN}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leverage</span>
              <span>{leverage}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Slippage</span>
              <span>{slippageBps / 1000}%</span>
            </div>
          </div>

          {/* Open Position Button */}
          <Button
            onClick={handleOpenPosition}
            disabled={isTrading || !inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0}
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
                <p className="font-medium">Position opened!</p>
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

export default DemoFlash;
