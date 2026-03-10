"use client";

import React, { useState, useMemo } from "react";
import { useGmsol } from "@/features/gmxsol/hooks/useGmsol";
import type {
    CreateOrderFormData,
    CreateDepositFormData,
    CreateWithdrawalFormData,
    CreateShiftFormData,
} from "@/features/gmxsol/types";
import type { CreateOrderKind } from "@gmsol-labs/gmsol-sdk";

// ─── Precision Constants (from gmsol-sdk / GMX-Solana) ────────────────

/** $1 USD = 1 × 10^20 in the SDK's internal representation */
const USD_PRECISION = 20;
/** SOL native decimals (lamports) */
const SOL_DECIMALS = 9;
/** USDC / USDT native decimals */
const USDC_DECIMALS = 6;
/** GM LP token decimals */
const LP_DECIMALS = 9;

// ─── Conversion Helpers ───────────────────────────────────────────────

/**
 * Convert a human-readable decimal string to a raw BigInt string.
 *   toRaw("100.5", 20) → "10050000000000000000000"
 */
function toRaw(value: string, decimals: number): string {
    if (!value || value.trim() === "" || Number(value) === 0) return "0";
    const [whole = "0", frac = ""] = value.split(".");
    const paddedFrac = frac.slice(0, decimals).padEnd(decimals, "0");
    const raw = (whole + paddedFrac).replace(/^0+/, "");
    return raw || "0";
}

/**
 * Convert a raw BigInt string back to a human-readable decimal string.
 *   fromRaw("10050000000000000000000", 20) → "100.5"
 */
function fromRaw(rawValue: string, decimals: number): string {
    if (!rawValue || rawValue === "0") return "0";
    const padded = rawValue.padStart(decimals + 1, "0");
    const whole = padded.slice(0, padded.length - decimals) || "0";
    const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole;
}

/** Format a raw USD value (10^20 precision) for display → "$1,234.56" */
function formatUsd(rawValue: string): string {
    const num = parseFloat(fromRaw(rawValue, USD_PRECISION));
    if (isNaN(num) || num === 0) return "$0.00";
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format a raw token amount for display */
function formatTokens(rawValue: string, decimals: number = SOL_DECIMALS): string {
    const num = parseFloat(fromRaw(rawValue, decimals));
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 });
}

/**
 * Derive the price precision exponent from the market name.
 *   SDK price = usd_price × 10^(30 − base_token_decimals)
 */
function getPricePrecision(marketName: string): number {
    const base = getBaseSymbol(marketName);
    if (["BTC", "WBTC"].includes(base)) return 22;
    if (["ETH", "WETH"].includes(base)) return 22;
    if (["USDC", "USDT", "DAI"].includes(base)) return 24;
    if (["BONK", "WIF", "BOME"].includes(base)) return 25;
    return 21; // SOL default
}

/** Determine collateral token decimals based on which token is selected */
function getCollateralDecimals(collateralToken: string, longToken: string): number {
    return collateralToken === longToken ? SOL_DECIMALS : USDC_DECIMALS;
}

/** Extract base token symbol from market name, e.g. "SOL/USD [USDC]" → "SOL" */
function getBaseSymbol(marketName: string): string {
    return (marketName.split("/")[0] || "SOL").trim().toUpperCase();
}

/**
 * Safe percentage of a raw BigInt string.
 *   rawPercentage("1000000", 50) → "500000"
 */
function rawPercentage(rawValue: string, percent: number): string {
    if (!rawValue || rawValue === "0" || percent <= 0) return "0";
    if (percent >= 100) return rawValue;
    const bn = BigInt(rawValue);
    const result = (bn * BigInt(Math.round(percent * 100))) / BigInt(10000);
    return result.toString();
}

// ─── UI Constants ─────────────────────────────────────────────────────

const LEVERAGE_PRESETS = [2, 5, 10, 20, 50];
const CLOSE_PERCENT_PRESETS = [25, 50, 75, 100];

const ORDER_KINDS: { label: string; value: CreateOrderKind }[] = [
    { label: "Market Increase", value: "MarketIncrease" },
    { label: "Market Decrease", value: "MarketDecrease" },
    { label: "Limit Increase", value: "LimitIncrease" },
    { label: "Limit Decrease", value: "LimitDecrease" },
    { label: "Stop-Loss Decrease", value: "StopLossDecrease" },
    { label: "Market Swap", value: "MarketSwap" },
    { label: "Limit Swap", value: "LimitSwap" },
];

type Tab = "orders" | "deposit" | "withdraw" | "shift";

// ─── Component ────────────────────────────────────────────────────────

const DemoGmSol = () => {
    const {
        markets,
        positions,
        orders,
        isLoading,
        error,
        txSignatures,
        fetchMarkets,
        fetchPositionsAndOrders,
        submitOrder,
        submitCloseOrder,
        submitUpdateOrder,
        submitClosePosition,
        submitDeposit,
        submitWithdrawal,
        submitShift,
        privyWallet,
    } = useGmsol();

    const [activeTab, setActiveTab] = useState<Tab>("orders");

    // ── Order form (leverage-based) ─────────────────────────────────────
    const [orderForm, setOrderForm] = useState({
        marketToken: "",
        collateralToken: "",
        longToken: "",
        shortToken: "",
        isLong: true,
        orderKind: "MarketIncrease" as CreateOrderKind,
        sizeSol: "",              // position size in index tokens (e.g. "1" for 1 SOL)
        leverage: "10",           // leverage multiplier
        markPrice: "",            // estimated USD price per index token
        // For decrease/swap orders (non-leverage mode)
        sizeUsd: "",              // position size in USD
        amount: "",               // collateral/pay amount in tokens
        // Shared
        triggerPrice: "",
        takeProfitPrice: "",
        stopLossPrice: "",
    });

    // ── Deposit form ────────────────────────────────────────────────────
    const [depositForm, setDepositForm] = useState({
        marketToken: "",
        longToken: "",
        shortToken: "",
        longPayToken: "",
        shortPayToken: "",
        longPayAmount: "",
        shortPayAmount: "",
        minReceiveAmount: "0",
    });

    // ── Withdrawal form ─────────────────────────────────────────────────
    const [withdrawForm, setWithdrawForm] = useState({
        marketToken: "",
        longToken: "",
        shortToken: "",
        marketTokenAmount: "",
    });

    // ── Shift form ──────────────────────────────────────────────────────
    const [shiftForm, setShiftForm] = useState({
        fromMarketToken: "",
        toMarketToken: "",
        fromMarketTokenAmount: "",
    });

    // ── Update order modal ──────────────────────────────────────────────
    const [updateTarget, setUpdateTarget] = useState<string | null>(null);
    const [updateFields, setUpdateFields] = useState({
        sizeDeltaValue: "",
        triggerPrice: "",
    });

    // ── Close position state ────────────────────────────────────────────
    const [closingPositionAddr, setClosingPositionAddr] = useState<string | null>(null);
    const [closePercent, setClosePercent] = useState(100);

    // ── Preview visibility ──────────────────────────────────────────────
    const [showOrderPreview, setShowOrderPreview] = useState(false);

    // ── Derived helpers ─────────────────────────────────────────────────

    const selectedMarketForOrder = markets.find(
        (m) => m.marketTokenMint === orderForm.marketToken,
    );
    const baseSymbol = getBaseSymbol(selectedMarketForOrder?.name || "SOL/USD");
    const isPayingSol = orderForm.collateralToken === orderForm.longToken;
    const collateralSymbol = isPayingSol ? baseSymbol : "USDC";

    const isIncreaseOrder =
        orderForm.orderKind === "MarketIncrease" ||
        orderForm.orderKind === "LimitIncrease";

    const isSwapOrder =
        orderForm.orderKind === "MarketSwap" ||
        orderForm.orderKind === "LimitSwap";

    const needsTriggerPrice =
        orderForm.orderKind === "LimitIncrease" ||
        orderForm.orderKind === "LimitDecrease" ||
        orderForm.orderKind === "StopLossDecrease" ||
        orderForm.orderKind === "LimitSwap";

    // ── Market selectors ────────────────────────────────────────────────

    const selectMarketForOrder = (marketTokenMint: string) => {
        const market = markets.find((m) => m.marketTokenMint === marketTokenMint);
        if (market) {
            setOrderForm((prev) => ({
                ...prev,
                marketToken: market.marketTokenMint,
                collateralToken: market.longToken,
                longToken: market.longToken,
                shortToken: market.shortToken,
            }));
        }
    };

    const selectMarketForDeposit = (marketTokenMint: string) => {
        const market = markets.find((m) => m.marketTokenMint === marketTokenMint);
        if (market) {
            setDepositForm((prev) => ({
                ...prev,
                marketToken: market.marketTokenMint,
                longToken: market.longToken,
                shortToken: market.shortToken,
                longPayToken: market.longToken,
                shortPayToken: market.shortToken,
            }));
        }
    };

    const selectMarketForWithdraw = (marketTokenMint: string) => {
        const market = markets.find((m) => m.marketTokenMint === marketTokenMint);
        if (market) {
            setWithdrawForm((prev) => ({
                ...prev,
                marketToken: market.marketTokenMint,
                longToken: market.longToken,
                shortToken: market.shortToken,
            }));
        }
    };

    // ── Computed: order estimates (leverage mode) ────────────────────────

    const orderComputed = useMemo(() => {
        if (!isIncreaseOrder) return null;

        const size = parseFloat(orderForm.sizeSol) || 0;
        const lev = Math.max(parseFloat(orderForm.leverage) || 1, 1);
        const price = parseFloat(orderForm.markPrice) || 0;

        const positionValueUsd = size * price;
        const collateralValueUsd = positionValueUsd / lev;

        // Collateral in token terms
        const collateralTokenAmount = isPayingSol
            ? size / lev                           // SOL
            : (size * price) / lev;                // USDC

        return {
            positionValueUsd,
            collateralValueUsd,
            collateralTokenAmount,
            effectiveLeverage: lev,
            hasPriceData: price > 0 && size > 0,
        };
    }, [orderForm.sizeSol, orderForm.leverage, orderForm.markPrice, isPayingSol, isIncreaseOrder]);

    // ── Computed: close position details ────────────────────────────────

    const closeComputed = useMemo(() => {
        if (!closingPositionAddr) return null;
        const pos = positions.find((p) => p.address === closingPositionAddr);
        if (!pos) return null;

        const closeSizeUsd = rawPercentage(pos.sizeInUsd, closePercent);
        const closeSizeTokens = rawPercentage(pos.sizeInTokens, closePercent);
        const closeCollateral = rawPercentage(pos.collateralAmount, closePercent);

        return {
            closeSizeUsd,
            closeSizeTokens,
            closeCollateral,
            isFullClose: closePercent >= 100,
        };
    }, [closingPositionAddr, closePercent, positions]);

    // ── Submit: order (leverage mode for increase, raw for others) ──────

    const handleSubmitOrder = () => {
        if (isIncreaseOrder && orderComputed) {
            if (!(parseFloat(orderForm.sizeSol) > 0) || !(parseFloat(orderForm.markPrice) > 0)) {
                alert("Please enter a valid Position Size (>0) and Mark Price (>0)");
                return;
            }
        }

        const pricePrecision = getPricePrecision(selectedMarketForOrder?.name || "");
        const collateralDec = getCollateralDecimals(orderForm.collateralToken, orderForm.longToken);

        let sizeDeltaUsd: string;
        let amount: string;

        if (isIncreaseOrder && orderComputed) {
            // Leverage mode: derive from sizeSol × markPrice / leverage
            const sizeVal = parseFloat(orderForm.sizeSol) || 0;
            const levVal = Math.max(parseFloat(orderForm.leverage) || 1, 1);
            const priceVal = parseFloat(orderForm.markPrice) || 0;

            const posValueUsd = sizeVal * priceVal;
            const collateralTokenAmt = isPayingSol
                ? sizeVal / levVal
                : (sizeVal * priceVal) / levVal;

            sizeDeltaUsd = toRaw(posValueUsd.toFixed(6), USD_PRECISION);
            amount = toRaw(collateralTokenAmt.toFixed(collateralDec), collateralDec);
        } else {
            // Direct mode for decrease/swap
            sizeDeltaUsd = toRaw(orderForm.sizeUsd, USD_PRECISION);
            amount = toRaw(orderForm.amount, collateralDec);
        }

        const formData: CreateOrderFormData = {
            marketToken: orderForm.marketToken,
            collateralToken: orderForm.collateralToken,
            longToken: orderForm.longToken,
            shortToken: orderForm.shortToken,
            isLong: orderForm.isLong,
            orderKind: orderForm.orderKind,
            sizeDeltaUsd,
            amount,
            triggerPrice: orderForm.triggerPrice ? toRaw(orderForm.triggerPrice, pricePrecision) : "",
            takeProfitPrice: orderForm.takeProfitPrice ? toRaw(orderForm.takeProfitPrice, pricePrecision) : "",
            stopLossPrice: orderForm.stopLossPrice ? toRaw(orderForm.stopLossPrice, pricePrecision) : "",
        };
        submitOrder(formData);
    };

    const handleSubmitDeposit = () => {
        const formData: CreateDepositFormData = {
            marketToken: depositForm.marketToken,
            longToken: depositForm.longToken,
            shortToken: depositForm.shortToken,
            longPayToken: depositForm.longPayToken,
            shortPayToken: depositForm.shortPayToken,
            longPayAmount: toRaw(depositForm.longPayAmount, SOL_DECIMALS),
            shortPayAmount: toRaw(depositForm.shortPayAmount, USDC_DECIMALS),
            minReceiveAmount: toRaw(depositForm.minReceiveAmount, LP_DECIMALS),
        };
        submitDeposit(formData);
    };

    const handleSubmitWithdrawal = () => {
        const formData: CreateWithdrawalFormData = {
            marketToken: withdrawForm.marketToken,
            longToken: withdrawForm.longToken,
            shortToken: withdrawForm.shortToken,
            marketTokenAmount: toRaw(withdrawForm.marketTokenAmount, LP_DECIMALS),
        };
        submitWithdrawal(formData);
    };

    const handleSubmitShift = () => {
        const formData: CreateShiftFormData = {
            fromMarketToken: shiftForm.fromMarketToken,
            toMarketToken: shiftForm.toMarketToken,
            fromMarketTokenAmount: toRaw(shiftForm.fromMarketTokenAmount, LP_DECIMALS),
        };
        submitShift(formData);
    };

    const handleSubmitUpdate = async () => {
        if (!updateTarget) return;
        const orderInfo = orders.find((o) => o.address === updateTarget);
        const market = orderInfo
            ? markets.find((m) => m.marketTokenMint === orderInfo.marketToken)
            : undefined;
        const pricePrecision = getPricePrecision(market?.name || "");

        await submitUpdateOrder(updateTarget, {
            sizeDeltaValue: updateFields.sizeDeltaValue
                ? toRaw(updateFields.sizeDeltaValue, USD_PRECISION)
                : undefined,
            triggerPrice: updateFields.triggerPrice
                ? toRaw(updateFields.triggerPrice, pricePrecision)
                : undefined,
        });
        setUpdateTarget(null);
        setUpdateFields({ sizeDeltaValue: "", triggerPrice: "" });
    };

    const handleClosePosition = async () => {
        if (!closingPositionAddr || !closeComputed) return;
        const pos = positions.find((p) => p.address === closingPositionAddr);
        if (!pos) return;

        await submitClosePosition(pos, closeComputed.closeSizeUsd);
        setClosingPositionAddr(null);
        setClosePercent(100);
    };

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">GMSOL Trading</h1>
                <button
                    onClick={() => {
                        fetchMarkets();
                        fetchPositionsAndOrders();
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? "Loading..." : "Refresh Data"}
                </button>
            </div>

            {/* Wallet status */}
            <div className="text-sm text-zinc-400">
                Wallet:{" "}
                {privyWallet ? (
                    <span className="text-green-400 font-mono">
                        {privyWallet.address.slice(0, 6)}...{privyWallet.address.slice(-4)}
                    </span>
                ) : (
                    <span className="text-yellow-400">Not connected</span>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded text-red-500">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* TX results */}
            {txSignatures.length > 0 && (
                <div className="p-4 bg-green-500/10 border border-green-500 rounded text-green-400">
                    <strong>Transactions Sent:</strong>
                    <div className="mt-1 space-y-1">
                        {txSignatures.map((sig, i) => (
                            <div key={i} className="font-mono text-xs break-all">
                                {sig}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══ Tab Navigation ══════════════════════════════════════════════ */}
            <div className="flex gap-1 border-b border-zinc-700">
                {(["orders", "deposit", "withdraw", "shift"] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                            ? "text-white border-b-2 border-blue-500"
                            : "text-zinc-400 hover:text-zinc-200"
                            }`}
                    >
                        {tab === "withdraw"
                            ? "Withdrawal"
                            : tab === "orders"
                                ? "Trade"
                                : tab === "deposit"
                                    ? "Add Liquidity"
                                    : "Shift"}
                    </button>
                ))}
            </div>

            {/* ══ ORDER TAB ════════════════════════════════════════════════════ */}
            {activeTab === "orders" && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Place Order</h2>

                    {/* Market selector */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Market</label>
                        <select
                            value={orderForm.marketToken}
                            onChange={(e) => selectMarketForOrder(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">-- Select a market --</option>
                            {markets.map((m) => (
                                <option key={m.marketTokenMint} value={m.marketTokenMint}>
                                    {m.name || m.address.slice(0, 12) + "..."}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Order kind */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Order Type</label>
                        <select
                            value={orderForm.orderKind}
                            onChange={(e) => setOrderForm((p) => ({ ...p, orderKind: e.target.value as CreateOrderKind }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                        >
                            {ORDER_KINDS.map((k) => (
                                <option key={k.value} value={k.value}>
                                    {k.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Collateral token dropdown */}
                    {orderForm.marketToken && !isSwapOrder && (
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Pay With</label>
                            <select
                                value={orderForm.collateralToken}
                                onChange={(e) => setOrderForm((p) => ({ ...p, collateralToken: e.target.value }))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                            >
                                <option value={orderForm.longToken}>
                                    Long Token ({orderForm.longToken.slice(0, 6)}...{orderForm.longToken.slice(-4)})
                                </option>
                                <option value={orderForm.shortToken}>
                                    Short Token ({orderForm.shortToken.slice(0, 6)}...{orderForm.shortToken.slice(-4)})
                                </option>
                            </select>
                        </div>
                    )}

                    {/* Side buttons — not for swap orders */}
                    {!isSwapOrder && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setOrderForm((p) => ({ ...p, isLong: true }))}
                                className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${orderForm.isLong ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                    }`}
                            >
                                Long
                            </button>
                            <button
                                onClick={() => setOrderForm((p) => ({ ...p, isLong: false }))}
                                className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${!orderForm.isLong ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                    }`}
                            >
                                Short
                            </button>
                        </div>
                    )}

                    {/* ── INCREASE ORDER: Leverage-based inputs ─────────────────── */}
                    {isIncreaseOrder && (
                        <>
                            {/* Size in tokens */}
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">
                                    Position Size <span className="text-zinc-600">({baseSymbol})</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={orderForm.sizeSol}
                                    onChange={(e) => setOrderForm((p) => ({ ...p, sizeSol: e.target.value }))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                    placeholder={`e.g. 1.0 ${baseSymbol}`}
                                />
                            </div>

                            {/* Leverage selector */}
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Leverage</label>
                                <div className="flex gap-2 mb-2">
                                    {LEVERAGE_PRESETS.map((lev) => (
                                        <button
                                            key={lev}
                                            onClick={() => setOrderForm((p) => ({ ...p, leverage: String(lev) }))}
                                            className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${parseFloat(orderForm.leverage) === lev
                                                ? "bg-blue-600 text-white"
                                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700"
                                                }`}
                                        >
                                            {lev}x
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="1.1"
                                    max="100"
                                    value={orderForm.leverage}
                                    onChange={(e) => setOrderForm((p) => ({ ...p, leverage: e.target.value }))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                    placeholder="Custom leverage (1.1x – 100x)"
                                />
                            </div>

                            {/* Mark price */}
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">
                                    Mark Price <span className="text-zinc-600">($/{baseSymbol})</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={orderForm.markPrice}
                                    onChange={(e) => setOrderForm((p) => ({ ...p, markPrice: e.target.value }))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                    placeholder="Current price (will auto-fill from oracle)"
                                />
                                <p className="text-[10px] text-zinc-600 mt-1">
                                    Used to estimate position value and collateral. Market orders execute at oracle price.
                                </p>
                            </div>

                            {/* Auto-calculated collateral display */}
                            {orderComputed && orderComputed.hasPriceData && (
                                <div className="p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-lg space-y-1.5">
                                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estimated Collateral</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Required Collateral</span>
                                        <span className="text-white font-medium">
                                            {orderComputed.collateralTokenAmount.toFixed(isPayingSol ? 6 : 2)} {collateralSymbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Collateral Value</span>
                                        <span className="text-white">
                                            ${orderComputed.collateralValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Position Value</span>
                                        <span className="text-white font-medium">
                                            ${orderComputed.positionValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Effective Leverage</span>
                                        <span className="text-blue-400 font-medium">{orderComputed.effectiveLeverage}x</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── DECREASE / SWAP: Direct inputs ────────────────────────── */}
                    {!isIncreaseOrder && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">
                                    {isSwapOrder ? "Pay Amount" : "Close Size"}
                                    <span className="text-zinc-600 ml-1">
                                        ({isSwapOrder ? collateralSymbol : "USD"})
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={isSwapOrder ? orderForm.amount : orderForm.sizeUsd}
                                    onChange={(e) => {
                                        if (isSwapOrder) {
                                            setOrderForm((p) => ({ ...p, amount: e.target.value }));
                                        } else {
                                            setOrderForm((p) => ({ ...p, sizeUsd: e.target.value }));
                                        }
                                    }}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                    placeholder={isSwapOrder ? `e.g. 1.0 ${collateralSymbol}` : "e.g. 100"}
                                />
                            </div>
                            {!isSwapOrder && (
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">
                                        Withdraw Amount
                                        <span className="text-zinc-600 ml-1">({collateralSymbol})</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={orderForm.amount}
                                        onChange={(e) => setOrderForm((p) => ({ ...p, amount: e.target.value }))}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                        placeholder="0 for proportional"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trigger price (limit/stop-loss orders) */}
                    {needsTriggerPrice && (
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">
                                Trigger Price <span className="text-zinc-600">($)</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={orderForm.triggerPrice}
                                onChange={(e) => setOrderForm((p) => ({ ...p, triggerPrice: e.target.value }))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                placeholder="e.g. 150.00"
                            />
                        </div>
                    )}

                    {/* TP/SL for market increase */}
                    {orderForm.orderKind === "MarketIncrease" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">
                                    Take-Profit <span className="text-zinc-600">($, optional)</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={orderForm.takeProfitPrice}
                                    onChange={(e) => setOrderForm((p) => ({ ...p, takeProfitPrice: e.target.value }))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                    placeholder="e.g. 180.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">
                                    Stop-Loss <span className="text-zinc-600">($, optional)</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={orderForm.stopLossPrice}
                                    onChange={(e) => setOrderForm((p) => ({ ...p, stopLossPrice: e.target.value }))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                    placeholder="e.g. 120.00"
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Order Preview Panel ───────────────────────────────────── */}
                    {orderForm.marketToken && (
                        <div className="p-4 bg-zinc-800/70 border border-zinc-700 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-zinc-300">Order Preview</h3>
                                <button
                                    onClick={() => setShowOrderPreview(!showOrderPreview)}
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                    {showOrderPreview ? "Hide Details" : "Show Details"}
                                </button>
                            </div>

                            {/* Always-visible summary */}
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between text-zinc-400">
                                    <span>Order Type</span>
                                    <span className="text-white font-medium">
                                        {ORDER_KINDS.find((k) => k.value === orderForm.orderKind)?.label ?? orderForm.orderKind}
                                    </span>
                                </div>
                                {!isSwapOrder && (
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Side</span>
                                        <span className={`font-medium ${orderForm.isLong ? "text-green-400" : "text-red-400"}`}>
                                            {orderForm.isLong ? "LONG" : "SHORT"}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-zinc-400">
                                    <span>Market</span>
                                    <span className="text-white text-xs">
                                        {selectedMarketForOrder?.name || orderForm.marketToken.slice(0, 12) + "..."}
                                    </span>
                                </div>
                            </div>

                            {/* Expanded details */}
                            {showOrderPreview && (
                                <div className="text-sm space-y-1 pt-2 border-t border-zinc-700">
                                    {isIncreaseOrder && orderComputed && orderComputed.hasPriceData && (
                                        <>
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Position Size</span>
                                                <span className="text-white">
                                                    {orderForm.sizeSol} {baseSymbol} ≈ ${orderComputed.positionValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Leverage</span>
                                                <span className="text-blue-400 font-medium">{orderComputed.effectiveLeverage}x</span>
                                            </div>
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Collateral</span>
                                                <span className="text-white">
                                                    {orderComputed.collateralTokenAmount.toFixed(isPayingSol ? 6 : 2)} {collateralSymbol}
                                                    {" ≈ $"}{orderComputed.collateralValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Mark Price</span>
                                                <span className="text-white">${Number.isFinite(parseFloat(orderForm.markPrice)) ? parseFloat(orderForm.markPrice).toLocaleString() : "-"}</span>
                                            </div>
                                        </>
                                    )}
                                    {!isIncreaseOrder && (
                                        <>
                                            {orderForm.sizeUsd && (
                                                <div className="flex justify-between text-zinc-400">
                                                    <span>{isSwapOrder ? "Pay Amount" : "Close Size"}</span>
                                                    <span className="text-white">
                                                        {isSwapOrder
                                                            ? `${orderForm.amount} ${collateralSymbol}`
                                                            : `$${parseFloat(orderForm.sizeUsd || "0").toLocaleString()}`}
                                                    </span>
                                                </div>
                                            )}
                                            {!isSwapOrder && orderForm.amount && (
                                                <div className="flex justify-between text-zinc-400">
                                                    <span>Withdraw Amount</span>
                                                    <span className="text-white">{orderForm.amount} {collateralSymbol}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {needsTriggerPrice && orderForm.triggerPrice && (
                                        <div className="flex justify-between text-zinc-400">
                                            <span>Trigger Price</span>
                                            <span className="text-white">${Number.isFinite(parseFloat(orderForm.triggerPrice)) ? parseFloat(orderForm.triggerPrice).toLocaleString() : "-"}</span>
                                        </div>
                                    )}
                                    {orderForm.takeProfitPrice && (
                                        <div className="flex justify-between text-zinc-400">
                                            <span>Take-Profit</span>
                                            <span className="text-green-400">${Number.isFinite(parseFloat(orderForm.takeProfitPrice)) ? parseFloat(orderForm.takeProfitPrice).toLocaleString() : "-"}</span>
                                        </div>
                                    )}
                                    {orderForm.stopLossPrice && (
                                        <div className="flex justify-between text-zinc-400">
                                            <span>Stop-Loss</span>
                                            <span className="text-red-400">${Number.isFinite(parseFloat(orderForm.stopLossPrice)) ? parseFloat(orderForm.stopLossPrice).toLocaleString() : "-"}</span>
                                        </div>
                                    )}

                                    {/* Execution info */}
                                    <div className="pt-2 border-t border-zinc-700/50 space-y-1">
                                        <div className="flex justify-between text-zinc-400">
                                            <span>Priority Fee</span>
                                            <span className="text-zinc-300 text-xs">2M microlamports/CU</span>
                                        </div>
                                        <div className="flex justify-between text-zinc-400">
                                            <span>Execution</span>
                                            <span className="text-white text-xs">
                                                {orderForm.orderKind.startsWith("Market") ? "Immediate (oracle price)" : "When trigger price is reached"}
                                            </span>
                                        </div>
                                        {(orderForm.takeProfitPrice || orderForm.stopLossPrice) && (
                                            <div className="flex justify-between text-zinc-400">
                                                <span>Attached Orders</span>
                                                <span className="text-white text-xs">
                                                    {[orderForm.takeProfitPrice && "Take-Profit", orderForm.stopLossPrice && "Stop-Loss"].filter(Boolean).join(" + ")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleSubmitOrder}
                        disabled={isLoading || !privyWallet || !orderForm.marketToken}
                        className="w-full py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Submitting..." : "Place Order"}
                    </button>
                </div>
            )}

            {/* ══ DEPOSIT TAB ══════════════════════════════════════════════════ */}
            {activeTab === "deposit" && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Add Liquidity</h2>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Market</label>
                        <select
                            value={depositForm.marketToken}
                            onChange={(e) => selectMarketForDeposit(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">-- Select a market --</option>
                            {markets.map((m) => (
                                <option key={m.marketTokenMint} value={m.marketTokenMint}>
                                    {m.name || m.address.slice(0, 12) + "..."}
                                </option>
                            ))}
                        </select>
                    </div>

                    {depositForm.marketToken && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700/50">
                                <span className="text-xs text-zinc-500">Long Token</span>
                                <div className="font-mono text-xs text-zinc-300 truncate">
                                    {depositForm.longPayToken.slice(0, 8)}...{depositForm.longPayToken.slice(-4)}
                                </div>
                            </div>
                            <div className="p-2 bg-zinc-800/50 rounded border border-zinc-700/50">
                                <span className="text-xs text-zinc-500">Short Token</span>
                                <div className="font-mono text-xs text-zinc-300 truncate">
                                    {depositForm.shortPayToken.slice(0, 8)}...{depositForm.shortPayToken.slice(-4)}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Long Token Amount <span className="text-zinc-600">(SOL)</span></label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={depositForm.longPayAmount}
                                onChange={(e) => setDepositForm((p) => ({ ...p, longPayAmount: e.target.value }))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                placeholder="e.g. 1.0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Short Token Amount <span className="text-zinc-600">(USDC)</span></label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={depositForm.shortPayAmount}
                                onChange={(e) => setDepositForm((p) => ({ ...p, shortPayAmount: e.target.value }))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                placeholder="e.g. 100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Min. LP Tokens to Receive</label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={depositForm.minReceiveAmount}
                            onChange={(e) => setDepositForm((p) => ({ ...p, minReceiveAmount: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                            placeholder="0 for no minimum"
                        />
                    </div>

                    <button
                        onClick={handleSubmitDeposit}
                        disabled={isLoading || !privyWallet || !depositForm.marketToken}
                        className="w-full py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Submitting..." : "Add Liquidity"}
                    </button>
                </div>
            )}

            {/* ══ WITHDRAWAL TAB ═══════════════════════════════════════════════ */}
            {activeTab === "withdraw" && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Remove Liquidity</h2>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Market</label>
                        <select
                            value={withdrawForm.marketToken}
                            onChange={(e) => selectMarketForWithdraw(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">-- Select a market --</option>
                            {markets.map((m) => (
                                <option key={m.marketTokenMint} value={m.marketTokenMint}>
                                    {m.name || m.address.slice(0, 12) + "..."}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">LP Token Amount to Withdraw</label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={withdrawForm.marketTokenAmount}
                            onChange={(e) => setWithdrawForm((p) => ({ ...p, marketTokenAmount: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                            placeholder="e.g. 2.0"
                        />
                    </div>

                    <button
                        onClick={handleSubmitWithdrawal}
                        disabled={isLoading || !privyWallet || !withdrawForm.marketToken}
                        className="w-full py-3 bg-orange-600 text-white rounded font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Submitting..." : "Remove Liquidity"}
                    </button>
                </div>
            )}

            {/* ══ SHIFT TAB ═══════════════════════════════════════════════════ */}
            {activeTab === "shift" && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Shift Liquidity</h2>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Source Market</label>
                        <select
                            value={shiftForm.fromMarketToken}
                            onChange={(e) => setShiftForm((p) => ({ ...p, fromMarketToken: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">-- Select source market --</option>
                            {markets.map((m) => (
                                <option key={m.marketTokenMint} value={m.marketTokenMint}>
                                    {m.name || m.address.slice(0, 12) + "..."}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Destination Market</label>
                        <select
                            value={shiftForm.toMarketToken}
                            onChange={(e) => setShiftForm((p) => ({ ...p, toMarketToken: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">-- Select destination market --</option>
                            {markets.filter((m) => m.marketTokenMint !== shiftForm.fromMarketToken).map((m) => (
                                <option key={m.marketTokenMint} value={m.marketTokenMint}>
                                    {m.name || m.address.slice(0, 12) + "..."}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">LP Token Amount</label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={shiftForm.fromMarketTokenAmount}
                            onChange={(e) => setShiftForm((p) => ({ ...p, fromMarketTokenAmount: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                            placeholder="e.g. 2.0"
                        />
                    </div>

                    <button
                        onClick={handleSubmitShift}
                        disabled={isLoading || !privyWallet || !shiftForm.fromMarketToken || !shiftForm.toMarketToken}
                        className="w-full py-3 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Submitting..." : "Shift Liquidity"}
                    </button>
                </div>
            )}

            {/* ══ Markets Grid ════════════════════════════════════════════════ */}
            <div>
                <h2 className="text-xl font-bold mb-4">Markets</h2>
                {isLoading && markets.length === 0 ? (
                    <div className="flex justify-center p-12 text-zinc-400">Loading markets...</div>
                ) : markets.length === 0 ? (
                    <div className="flex justify-center p-12 text-zinc-400">No markets found.</div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {markets.map((market) => (
                            <div
                                key={market.address}
                                className="p-4 border border-zinc-800 rounded-lg bg-zinc-900/50 space-y-2"
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-semibold">{market.name}</h3>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${market.isEnabled ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                            }`}
                                    >
                                        {market.isEnabled ? "Active" : "Disabled"}
                                    </span>
                                </div>
                                <div className="text-sm space-y-1 text-zinc-400">
                                    <div className="flex flex-col">
                                        <span className="text-zinc-500 text-xs">Market Token</span>
                                        <span className="font-mono text-xs truncate">{market.marketTokenMint}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-zinc-500 text-xs">Index Token</span>
                                        <span className="font-mono text-xs truncate">{market.indexToken}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══ Active Positions ════════════════════════════════════════════ */}
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Active Positions</h2>
                {isLoading && positions.length === 0 ? (
                    <div className="text-zinc-400">Loading positions...</div>
                ) : positions.length === 0 ? (
                    <div className="text-zinc-400">No active positions found.</div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                        {positions.map((pos) => {
                            const posMarket = markets.find((m) => m.marketTokenMint === pos.marketToken);
                            const posBaseSymbol = getBaseSymbol(posMarket?.name || "SOL/USD");
                            const posCollDec = posMarket && pos.collateralToken === posMarket.longToken ? SOL_DECIMALS : USDC_DECIMALS;
                            const posCollSymbol = posMarket && pos.collateralToken === posMarket.longToken ? posBaseSymbol : "USDC";
                            return (
                                <div
                                    key={pos.address}
                                    className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/50 flex flex-col justify-between space-y-4"
                                >
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-md font-semibold">
                                                {posMarket?.name || pos.marketToken.slice(0, 12) + "..."}
                                            </h3>
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${pos.side === "long" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                                    }`}
                                            >
                                                {pos.side.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-sm space-y-1 text-zinc-400">
                                            <div className="flex justify-between">
                                                <span>Size (USD)</span>
                                                <span className="font-medium text-white">{formatUsd(pos.sizeInUsd)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Size ({posBaseSymbol})</span>
                                                <span>{formatTokens(pos.sizeInTokens)} {posBaseSymbol}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Collateral</span>
                                                <span>{formatTokens(pos.collateralAmount, posCollDec)} {posCollSymbol}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setClosingPositionAddr(pos.address);
                                            setClosePercent(100);
                                        }}
                                        disabled={isLoading}
                                        className="w-full py-2 bg-red-600/20 text-red-500 border border-red-600/50 rounded font-semibold hover:bg-red-600 hover:text-white disabled:opacity-50 transition-colors text-sm"
                                    >
                                        Close Position
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══ Pending Orders ══════════════════════════════════════════════ */}
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Pending Orders</h2>
                {isLoading && orders.length === 0 ? (
                    <div className="text-zinc-400">Loading orders...</div>
                ) : orders.length === 0 ? (
                    <div className="text-zinc-400">No pending orders found.</div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                        {orders.map((ord) => {
                            const ordMarket = markets.find((m) => m.marketTokenMint === ord.marketToken);
                            const ordPriceDec = getPricePrecision(ordMarket?.name || "");
                            return (
                                <div
                                    key={ord.address}
                                    className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/50 flex flex-col justify-between space-y-4"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-md font-semibold">
                                                {ord.kind} #{ord.id}
                                            </h3>
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500">
                                                {ord.actionState}
                                            </span>
                                        </div>
                                        <div className="text-sm space-y-1 text-zinc-400">
                                            <div className="flex justify-between">
                                                <span>Side</span>
                                                <span className={`font-medium ${ord.side === "long" ? "text-green-400" : "text-red-400"}`}>
                                                    {ord.side.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Size</span>
                                                <span className="font-medium text-white">{formatUsd(ord.sizeDeltaValue)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Trigger Price</span>
                                                <span>
                                                    {ord.triggerPrice !== "0"
                                                        ? `$${parseFloat(fromRaw(ord.triggerPrice, ordPriceDec)).toLocaleString()}`
                                                        : "Market"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setUpdateTarget(ord.address);
                                                setUpdateFields({ sizeDeltaValue: "", triggerPrice: "" });
                                            }}
                                            disabled={isLoading}
                                            className="flex-1 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded font-semibold hover:bg-blue-600 hover:text-white disabled:opacity-50 transition-colors text-sm"
                                        >
                                            Update
                                        </button>
                                        <button
                                            onClick={() => submitCloseOrder(ord.address)}
                                            disabled={isLoading}
                                            className="flex-1 py-2 bg-red-600/20 text-red-500 border border-red-600/50 rounded font-semibold hover:bg-red-600 hover:text-white disabled:opacity-50 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══ Close Position Modal ═══════════════════════════════════════ */}
            {closingPositionAddr && (() => {
                const pos = positions.find((p) => p.address === closingPositionAddr);
                if (!pos) return null;
                const posMarket = markets.find((m) => m.marketTokenMint === pos.marketToken);
                const posBaseSymbol = getBaseSymbol(posMarket?.name || "SOL/USD");
                const posCollDec = posMarket && pos.collateralToken === posMarket.longToken ? SOL_DECIMALS : USDC_DECIMALS;
                const posCollSymbol = posMarket && pos.collateralToken === posMarket.longToken ? posBaseSymbol : "USDC";

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md space-y-4">
                            <h3 className="text-lg font-semibold text-red-400">Close Position</h3>

                            {/* Position info */}
                            <div className="text-sm space-y-1 p-3 bg-zinc-800 rounded border border-zinc-700">
                                <div className="flex justify-between text-zinc-400">
                                    <span>Market</span>
                                    <span className="text-white">{posMarket?.name || pos.marketToken.slice(0, 12) + "..."}</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Side</span>
                                    <span className={`font-medium ${pos.side === "long" ? "text-green-400" : "text-red-400"}`}>
                                        {pos.side.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Total Size</span>
                                    <span className="text-white">
                                        {formatUsd(pos.sizeInUsd)} ({formatTokens(pos.sizeInTokens)} {posBaseSymbol})
                                    </span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Total Collateral</span>
                                    <span className="text-white">{formatTokens(pos.collateralAmount, posCollDec)} {posCollSymbol}</span>
                                </div>
                            </div>

                            {/* Close percentage selector */}
                            <div>
                                <label className="block text-xs text-zinc-500 mb-2">Close Amount</label>
                                <div className="flex gap-2 mb-2">
                                    {CLOSE_PERCENT_PRESETS.map((pct) => (
                                        <button
                                            key={pct}
                                            onClick={() => setClosePercent(pct)}
                                            className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${closePercent === pct
                                                ? "bg-red-600 text-white"
                                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700"
                                                }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max="100"
                                    value={closePercent}
                                    onChange={(e) => {
                                        const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                                        setClosePercent(val);
                                    }}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                    placeholder="Enter custom percentage (1-100)"
                                />
                            </div>

                            {/* Computed close details */}
                            {closeComputed && (
                                <div className="text-sm space-y-1 p-3 bg-zinc-800/60 rounded border border-zinc-700/50">
                                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                                        Closing {closePercent}% of Position
                                    </h4>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Close Size (USD)</span>
                                        <span className="text-white font-medium">{formatUsd(closeComputed.closeSizeUsd)}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Close Size ({posBaseSymbol})</span>
                                        <span className="text-white">{formatTokens(closeComputed.closeSizeTokens)} {posBaseSymbol}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Est. Collateral Return</span>
                                        <span className="text-white">{formatTokens(closeComputed.closeCollateral, posCollDec)} {posCollSymbol}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-700/50">
                                        <span>Priority Fee</span>
                                        <span className="text-zinc-300 text-xs">2M microlamports/CU</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Execution</span>
                                        <span className="text-white text-xs">Immediate (oracle price)</span>
                                    </div>
                                    {closeComputed.isFullClose && (
                                        <p className="text-xs text-yellow-400/80 pt-1">
                                            Full close — entire position will be closed.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setClosingPositionAddr(null);
                                        setClosePercent(100);
                                    }}
                                    className="flex-1 py-2 bg-zinc-800 text-zinc-400 rounded font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClosePosition}
                                    disabled={isLoading}
                                    className="flex-1 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                    {isLoading ? "Closing..." : `Close ${closePercent}%`}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ══ Update Order Modal ══════════════════════════════════════════ */}
            {updateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-semibold">Update Order</h3>
                        <p className="text-xs text-zinc-500 font-mono break-all">{updateTarget.slice(0, 20)}...{updateTarget.slice(-8)}</p>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">New Position Size <span className="text-zinc-600">(USD)</span></label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={updateFields.sizeDeltaValue}
                                onChange={(e) => setUpdateFields((p) => ({ ...p, sizeDeltaValue: e.target.value }))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                placeholder="Leave empty to keep current"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">New Trigger Price <span className="text-zinc-600">($)</span></label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={updateFields.triggerPrice}
                                onChange={(e) => setUpdateFields((p) => ({ ...p, triggerPrice: e.target.value }))}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                                placeholder="Leave empty to keep current"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setUpdateTarget(null)}
                                className="flex-1 py-2 bg-zinc-800 text-zinc-400 rounded font-medium hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitUpdate}
                                disabled={isLoading || (!updateFields.sizeDeltaValue && !updateFields.triggerPrice)}
                                className="flex-1 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {isLoading ? "Updating..." : "Confirm Update"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DemoGmSol;
