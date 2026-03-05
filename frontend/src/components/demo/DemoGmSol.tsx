"use client";

import React, { useState } from "react";
import { useGmsol } from "@/features/gmsol/hooks/useGmsol";
import { CreateOrderFormData } from "@/features/gmsol/types";

const DemoGmSol = () => {
    const {
        markets,
        isLoading,
        error,
        orderTxId,
        fetchMarkets,
        submitOrder,
        privyWallet,
    } = useGmsol();

    // ── Order form state ───────────────────────────────────────────────

    const [showOrderForm, setShowOrderForm] = useState(false);
    const [formData, setFormData] = useState<CreateOrderFormData>({
        marketAddress: "",
        collateralToken: "",
        isCollateralTokenLong: true,
        initialCollateralAmount: "1000000", // 1 token with 6 decimals
        isLong: true,
        sizeDeltaUsd: "100000000000000000000", // example
        executionFee: "5000000", // 0.005 SOL
    });

    const handleFieldChange = (
        field: keyof CreateOrderFormData,
        value: string | boolean,
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSelectMarket = (marketAddress: string) => {
        const market = markets.find((m) => m.address === marketAddress);
        if (market) {
            setFormData((prev) => ({
                ...prev,
                marketAddress: market.address,
                collateralToken: market.longToken,
                isCollateralTokenLong: true,
            }));
        }
    };

    const handleSubmitOrder = async () => {
        await submitOrder(formData);
    };

    // ── Render ─────────────────────────────────────────────────────────

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">GMSOL Markets Demo</h1>
                <div className="flex gap-2">
                    <button
                        onClick={fetchMarkets}
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Loading..." : "Refresh Markets"}
                    </button>
                    <button
                        onClick={() => setShowOrderForm((v) => !v)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                        {showOrderForm ? "Hide Order Form" : "Create Order"}
                    </button>
                </div>
            </div>

            {/* Wallet status */}
            <div className="text-sm text-zinc-400">
                Wallet:{" "}
                {privyWallet ? (
                    <span className="text-green-400 font-mono">
                        {privyWallet.address.slice(0, 6)}...
                        {privyWallet.address.slice(-4)}
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

            {/* Order TX result */}
            {orderTxId && (
                <div className="p-4 bg-green-500/10 border border-green-500 rounded text-green-400">
                    <strong>Order TX:</strong>{" "}
                    <span className="font-mono text-xs break-all">{orderTxId}</span>
                </div>
            )}

            {/* ── Order Form ──────────────────────────────────────────────── */}
            {showOrderForm && (
                <div className="p-4 border border-zinc-700 rounded-lg bg-zinc-900/60 space-y-4">
                    <h2 className="text-lg font-semibold">Create Market Order</h2>

                    {/* Market selector */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">
                            Select Market
                        </label>
                        <select
                            value={formData.marketAddress}
                            onChange={(e) => handleSelectMarket(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">-- Select a market --</option>
                            {markets.map((m) => (
                                <option key={m.address} value={m.address}>
                                    {m.name || m.address.slice(0, 12) + "..."}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Collateral token */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">
                            Collateral Token (mint address)
                        </label>
                        <input
                            type="text"
                            value={formData.collateralToken}
                            onChange={(e) =>
                                handleFieldChange("collateralToken", e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono"
                            placeholder="Token mint address"
                        />
                    </div>

                    {/* Side buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleFieldChange("isLong", true)}
                            className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${formData.isLong
                                    ? "bg-green-600 text-white"
                                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                }`}
                        >
                            Long
                        </button>
                        <button
                            onClick={() => handleFieldChange("isLong", false)}
                            className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${!formData.isLong
                                    ? "bg-red-600 text-white"
                                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                }`}
                        >
                            Short
                        </button>
                    </div>

                    {/* Collateral amount */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">
                            Initial Collateral Amount (raw)
                        </label>
                        <input
                            type="text"
                            value={formData.initialCollateralAmount}
                            onChange={(e) =>
                                handleFieldChange("initialCollateralAmount", e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono"
                        />
                    </div>

                    {/* Size delta */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">
                            Size Delta USD (raw u128)
                        </label>
                        <input
                            type="text"
                            value={formData.sizeDeltaUsd}
                            onChange={(e) =>
                                handleFieldChange("sizeDeltaUsd", e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono"
                        />
                    </div>

                    {/* Execution fee */}
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">
                            Execution Fee (lamports)
                        </label>
                        <input
                            type="text"
                            value={formData.executionFee}
                            onChange={(e) =>
                                handleFieldChange("executionFee", e.target.value)
                            }
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono"
                        />
                    </div>

                    <button
                        onClick={handleSubmitOrder}
                        disabled={isLoading || !privyWallet || !formData.marketAddress}
                        className="w-full py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Submitting..." : "Submit Order"}
                    </button>
                </div>
            )}

            {/* ── Markets Grid ────────────────────────────────────────────── */}
            {isLoading && markets.length === 0 ? (
                <div className="flex justify-center p-12 text-zinc-400">
                    Loading markets...
                </div>
            ) : markets.length === 0 ? (
                <div className="flex justify-center p-12 text-zinc-400">
                    No markets found.
                </div>
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
                                    className={`px-2 py-1 rounded text-xs font-medium ${market.isEnabled
                                            ? "bg-green-500/10 text-green-500"
                                            : "bg-red-500/10 text-red-500"
                                        }`}
                                >
                                    {market.isEnabled ? "Active" : "Disabled"}
                                </span>
                            </div>

                            <div className="text-sm space-y-1 text-zinc-400">
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 text-xs">Market Address</span>
                                    <span className="font-mono truncate">{market.address}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 text-xs">Index Token</span>
                                    <span className="font-mono truncate">
                                        {market.indexToken}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 text-xs">Long Token</span>
                                    <span className="font-mono truncate">{market.longToken}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 text-xs">Short Token</span>
                                    <span className="font-mono truncate">
                                        {market.shortToken}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DemoGmSol;