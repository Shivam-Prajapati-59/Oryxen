"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2, TrendingUp, TrendingDown, Info, AlertTriangle } from "lucide-react";
import { useDrift } from "@/features/drift";
import type { OrderVariant, TradeDirection } from "@/features/drift";
import { bnToBase, bnToPrice } from "@/features/drift";

// Environment configuration
const DRIFT_ENV = "devnet"; // Change to "mainnet-beta" for production

// Spot market options (Removed hardcoded indices, we use symbols now)
const SPOT_MARKETS = [
    { symbol: "USDC" },
    { symbol: "SOL" },
];

// Perp market options for trading
const PERP_MARKETS = [
    { index: 0, symbol: "SOL-PERP" },
    { index: 1, symbol: "BTC-PERP" },
    { index: 2, symbol: "ETH-PERP" },
];

// Order type options
const ORDER_TYPES: { value: OrderVariant; label: string }[] = [
    { value: "market", label: "Market" },
    { value: "limit", label: "Limit" },
    { value: "takeProfit", label: "Take Profit" },
    { value: "stopLimit", label: "Stop Limit" },
    { value: "scale", label: "Scale Orders" },
];

// Leverage options
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20];

const DemoDrift = () => {
    const { authenticated, login, ready } = usePrivy();

    // Deposit/Withdraw state
    const [selectedMarket, setSelectedMarket] = useState<string>("SOL");
    const [depositAmount, setDepositAmount] = useState<string>("0.5");
    const [withdrawAmount, setWithdrawAmount] = useState<string>("0.1");

    const [depositTx, setDepositTx] = useState<string | null>(null);
    const [withdrawTx, setWithdrawTx] = useState<string | null>(null);

    // Trading state
    const [perpMarketIndex, setPerpMarketIndex] = useState<number>(0); // SOL-PERP
    const [orderType, setOrderType] = useState<OrderVariant>("market");
    const [tradeDirection, setTradeDirection] = useState<TradeDirection>("long");
    const [tradeAmount, setTradeAmount] = useState<string>("0.1");
    const [leverage, setLeverage] = useState<number>(1);
    const [limitPrice, setLimitPrice] = useState<string>("");
    const [triggerPrice, setTriggerPrice] = useState<string>("");
    const [reduceOnly, setReduceOnly] = useState<boolean>(false);
    const [postOnly, setPostOnly] = useState<boolean>(false);

    // Scale order specific state
    const [scaleStartPrice, setScaleStartPrice] = useState<string>("");
    const [scaleEndPrice, setScaleEndPrice] = useState<string>("");
    const [scaleOrderCount, setScaleOrderCount] = useState<string>("5");

    const [tradeTx, setTradeTx] = useState<string | null>(null);

    // Use the useDrift hook for all Drift-related functionality
    const {
        driftClient,
        isInitialized,
        isLoading,
        error,
        user,
        userAccountExists,
        solanaWallet,
        initializeDriftClient,
        initializeUserAccount,
        deposit,
        withdraw,
        placeOrder,
        getFreeCollateral,
        getTotalCollateral,
        canAffordTrade,
        getOraclePrice,
        getPerpMarketInfo,
        calculateTradeDetails,
        getPositions,
        getSpotBalances,
        getAllOrders,
    } = useDrift();

    // Get collateral values for display
    const freeCollateral = getFreeCollateral();
    const totalCollateral = getTotalCollateral();

    // Calculate trade details for pre-trade summary
    const tradeDetails = useMemo(() => {
        const amount = parseFloat(tradeAmount) || 0;
        const leveragedAmount = amount * leverage;
        const price = parseFloat(limitPrice) || undefined;

        if (!isInitialized || leveragedAmount <= 0) return null;

        return calculateTradeDetails(
            perpMarketIndex,
            leveragedAmount,
            tradeDirection,
            leverage,
            orderType,
            price
        );
    }, [perpMarketIndex, tradeAmount, leverage, tradeDirection, orderType, limitPrice, isInitialized, calculateTradeDetails]);

    // Get current market info (price, funding)
    const marketInfo = useMemo(() => {
        if (!isInitialized) return null;
        return getPerpMarketInfo(perpMarketIndex);
    }, [perpMarketIndex, isInitialized, getPerpMarketInfo]);

    const handleDeposit = async () => {
        try {
            const amount = parseFloat(depositAmount);
            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }

            const result = await deposit(amount, selectedMarket, 0);

            if (result) {
                setDepositTx(result.explorerUrl);
            }
        } catch (err) {
            console.error("Deposit failed:", err);
        }
    };

    const handleWithdraw = async () => {
        try {
            const amount = parseFloat(withdrawAmount);
            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }

            const result = await withdraw(amount, selectedMarket, false, 0);
            if (result) {
                setWithdrawTx(result.explorerUrl);
            }
        } catch (err) {
            console.error("Withdraw failed:", err);
        }
    };

    const handlePlaceOrder = async () => {
        try {
            const amount = parseFloat(tradeAmount);
            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid trade amount");
                return;
            }

            // Calculate leveraged position size
            const leveragedAmount = amount * leverage;

            // Check if user can afford the trade before submitting
            const affordCheck = canAffordTrade(leveragedAmount, perpMarketIndex);
            if (!affordCheck.canAfford) {
                alert(affordCheck.reason || "Insufficient collateral for this trade");
                return;
            }

            // Build order params based on order type
            const orderParams: any = {
                marketIndex: perpMarketIndex,
                direction: tradeDirection,
                baseAssetAmount: leveragedAmount,
                orderVariant: orderType,
                reduceOnly,
                postOnly: orderType === "limit" ? postOnly : false,
                subAccountId: 0,
            };

            // Add price for limit orders
            if (orderType === "limit" || orderType === "takeProfit" || orderType === "stopLimit") {
                const price = parseFloat(limitPrice);
                if (isNaN(price) || price <= 0) {
                    alert("Please enter a valid limit price");
                    return;
                }
                orderParams.price = price;
            }

            // Add trigger price for trigger orders
            if (orderType === "takeProfit" || orderType === "stopLimit") {
                const trigger = parseFloat(triggerPrice);
                if (isNaN(trigger) || trigger <= 0) {
                    alert("Please enter a valid trigger price");
                    return;
                }
                orderParams.triggerPrice = trigger;
            }

            // Add scale order params
            if (orderType === "scale") {
                const startPrice = parseFloat(scaleStartPrice);
                const endPrice = parseFloat(scaleEndPrice);
                const orderCount = parseInt(scaleOrderCount);

                if (isNaN(startPrice) || startPrice <= 0) {
                    alert("Please enter a valid start price");
                    return;
                }
                if (isNaN(endPrice) || endPrice <= 0) {
                    alert("Please enter a valid end price");
                    return;
                }
                if (isNaN(orderCount) || orderCount < 2) {
                    alert("Order count must be at least 2");
                    return;
                }

                orderParams.startPrice = startPrice;
                orderParams.endPrice = endPrice;
                orderParams.orderCount = orderCount;
            }

            const result = await placeOrder(orderParams);
            if (result) {
                setTradeTx(result.explorerUrl);
            }
        } catch (err) {
            console.error("Trade failed:", err);
        }
    };

    // Auto-initialize when wallet is connected
    useEffect(() => {
        if (solanaWallet && !isInitialized && !isLoading) {
            initializeDriftClient();
        }
    }, [solanaWallet, isInitialized, isLoading, initializeDriftClient]);

    // Loading state
    if (!ready) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading Privy...</span>
            </div>
        );
    }

    // Not authenticated
    if (!authenticated) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
                <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
                <p className="text-muted-foreground">
                    Connect your Solana wallet to use Drift Protocol
                </p>
                <Button onClick={login}>Connect Wallet</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-8">
            <h1 className="text-2xl font-bold">Drift Protocol Demo</h1>

            {/* Wallet Info */}
            <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Connected Wallet</h3>
                {solanaWallet ? (
                    <div className="space-y-1 text-sm">
                        <p>
                            <span className="text-muted-foreground">Address: </span>
                            <code className="bg-muted px-2 py-1 rounded">
                                {solanaWallet.address}
                            </code>
                        </p>
                    </div>
                ) : (
                    <p className="text-muted-foreground">No Solana wallet found</p>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Drift Status */}
            <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Drift Status</h3>
                <div className="space-y-2 text-sm">
                    <p>
                        <span className="text-muted-foreground">Environment: </span>
                        <span className="font-mono">{DRIFT_ENV}</span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">Client Initialized: </span>
                        <span className={isInitialized ? "text-green-500" : "text-yellow-500"}>
                            {isInitialized ? "Yes" : "No"}
                        </span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">User Account: </span>
                        <span className={userAccountExists ? "text-green-500" : "text-yellow-500"}>
                            {userAccountExists === null
                                ? "Unknown"
                                : userAccountExists
                                    ? "Exists"
                                    : "Not Created"}
                        </span>
                    </p>
                    {user && (
                        <p>
                            <span className="text-muted-foreground">User Public Key: </span>
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                                {user.userAccountPublicKey.toBase58()}
                            </code>
                        </p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
                {!isInitialized && (
                    <Button onClick={initializeDriftClient} disabled={isLoading || !solanaWallet}>
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Initializing...
                            </>
                        ) : (
                            "Initialize Drift Client"
                        )}
                    </Button>
                )}

                {isInitialized && !userAccountExists && (
                    <Button onClick={() => initializeUserAccount(0, "Main Account")} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Creating Account...
                            </>
                        ) : (
                            "Create User Account"
                        )}
                    </Button>
                )}

                {isInitialized && userAccountExists && (
                    <div className="space-y-4">
                        <div className="text-green-500 font-medium flex items-center gap-2">
                            ✓ Ready to trade on Drift!
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Deposit Section */}
                            <div className="rounded-lg border p-4 space-y-4">
                                <h3 className="font-semibold">Deposit to Drift</h3>
                                <p className="text-sm text-muted-foreground">
                                    Transfer tokens from your wallet to your Drift account.
                                </p>

                                {/* Token Selection (Now handles Strings) */}
                                <div className="space-y-2">
                                    <label htmlFor="market" className="text-sm font-medium">Select Token</label>
                                    <select
                                        id="market"
                                        value={selectedMarket}
                                        onChange={(e) => setSelectedMarket(e.target.value)} // Set String
                                        className="w-full p-2 border rounded-md bg-background"
                                    >
                                        {SPOT_MARKETS.map((market) => (
                                            <option key={market.symbol} value={market.symbol}>
                                                {market.symbol}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Amount Input */}
                                <div className="space-y-2">
                                    <label htmlFor="amount" className="text-sm font-medium">Amount</label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="0.0"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            className="flex-1"
                                            min="0"
                                            step="0.1"
                                        />
                                        <span className="self-center text-sm text-muted-foreground w-16">
                                            {selectedMarket}
                                        </span>
                                    </div>
                                </div>

                                <Button onClick={handleDeposit} disabled={isLoading} className="w-full">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        `Deposit ${depositAmount} ${selectedMarket}`
                                    )}
                                </Button>

                                {depositTx && (
                                    <div className="text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                        <span className="text-green-600 dark:text-green-400">✓ Deposit successful! </span>
                                        <a
                                            href={depositTx}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            View on Solscan ↗
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Withdraw Section */}
                            <div className="rounded-lg border p-4 space-y-4">
                                <h3 className="font-semibold">Withdraw from Drift</h3>
                                <p className="text-sm text-muted-foreground">
                                    Transfer tokens from your Drift account back to your wallet.
                                </p>

                                {/* Token Selection */}
                                <div className="space-y-2">
                                    <label htmlFor="withdraw-market" className="text-sm font-medium">Select Token</label>
                                    <select
                                        id="withdraw-market"
                                        value={selectedMarket}
                                        onChange={(e) => setSelectedMarket(e.target.value)} // Set String
                                        className="w-full p-2 border rounded-md bg-background"
                                    >
                                        {SPOT_MARKETS.map((market) => (
                                            <option key={market.symbol} value={market.symbol}>
                                                {market.symbol}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Amount Input */}
                                <div className="space-y-2">
                                    <label htmlFor="withdraw-amount" className="text-sm font-medium">Amount</label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="withdraw-amount"
                                            type="number"
                                            placeholder="0.0"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            className="flex-1"
                                            min="0"
                                            step="0.1"
                                        />
                                        <span className="self-center text-sm text-muted-foreground w-16">
                                            {selectedMarket}
                                        </span>
                                    </div>
                                </div>

                                <Button onClick={handleWithdraw} disabled={isLoading} className="w-full" variant="outline">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        `Withdraw ${withdrawAmount} ${selectedMarket}`
                                    )}
                                </Button>

                                {withdrawTx && (
                                    <div className="text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                        <span className="text-green-600 dark:text-green-400">✓ Withdraw successful! </span>
                                        <a
                                            href={withdrawTx}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            View on Solscan ↗
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Trading Section */}
                            <div className="rounded-lg border p-4 space-y-4">
                                <h3 className="font-semibold">Place Perp Order</h3>
                                <p className="text-sm text-muted-foreground">
                                    Trade perpetual contracts with leverage on Drift.
                                </p>

                                {/* Market Info Panel */}
                                {marketInfo && (
                                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 space-y-3 border border-blue-500/20">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Info className="h-4 w-4 text-blue-500" />
                                            <span>Market Info - {PERP_MARKETS.find(m => m.index === perpMarketIndex)?.symbol}</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs">Oracle Price</p>
                                                <p className="font-mono font-medium text-lg">
                                                    ${marketInfo.oraclePrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs">Mark Price</p>
                                                <p className="font-mono font-medium">
                                                    ${marketInfo.markPriceTwap?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "—"}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs">Funding Rate (8h)</p>
                                                <p className={`font-mono font-medium ${marketInfo.fundingRate8h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                    {marketInfo.fundingRate8h >= 0 ? "+" : ""}{(marketInfo.fundingRate8h * 100).toFixed(4)}%
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-muted-foreground text-xs">Bid / Ask</p>
                                                <p className="font-mono font-medium">
                                                    ${marketInfo.bidPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"} / ${marketInfo.askPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Collateral Info */}
                                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Collateral:</span>
                                        <span className="font-medium">
                                            ${totalCollateral !== null ? totalCollateral.toFixed(2) : "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Free Collateral:</span>
                                        <span className={`font-medium ${freeCollateral !== null && freeCollateral < 10 ? "text-yellow-500" : "text-green-500"}`}>
                                            ${freeCollateral !== null ? freeCollateral.toFixed(2) : "—"}
                                        </span>
                                    </div>
                                </div>

                                {/* Market Selection */}
                                <div className="space-y-2">
                                    <label htmlFor="perp-market" className="text-sm font-medium">Market</label>
                                    <select
                                        id="perp-market"
                                        value={perpMarketIndex}
                                        onChange={(e) => setPerpMarketIndex(Number(e.target.value))}
                                        className="w-full p-2 border rounded-md bg-background"
                                    >
                                        {PERP_MARKETS.map((market) => (
                                            <option key={market.index} value={market.index}>
                                                {market.symbol}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Direction Buttons */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Direction</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={tradeDirection === "long" ? "default" : "outline"}
                                            className={tradeDirection === "long" ? "bg-green-600 hover:bg-green-700" : ""}
                                            onClick={() => setTradeDirection("long")}
                                        >
                                            <TrendingUp className="h-4 w-4 mr-2" />
                                            Long
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={tradeDirection === "short" ? "default" : "outline"}
                                            className={tradeDirection === "short" ? "bg-red-600 hover:bg-red-700" : ""}
                                            onClick={() => setTradeDirection("short")}
                                        >
                                            <TrendingDown className="h-4 w-4 mr-2" />
                                            Short
                                        </Button>
                                    </div>
                                </div>

                                {/* Order Type Selection */}
                                <div className="space-y-2">
                                    <label htmlFor="order-type" className="text-sm font-medium">Order Type</label>
                                    <select
                                        id="order-type"
                                        value={orderType}
                                        onChange={(e) => setOrderType(e.target.value as OrderVariant)}
                                        className="w-full p-2 border rounded-md bg-background"
                                    >
                                        {ORDER_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Leverage Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Leverage: {leverage}x</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {LEVERAGE_OPTIONS.map((lev) => (
                                            <Button
                                                key={lev}
                                                type="button"
                                                size="sm"
                                                variant={leverage === lev ? "default" : "outline"}
                                                onClick={() => setLeverage(lev)}
                                                className="min-w-[48px]"
                                            >
                                                {lev}x
                                            </Button>
                                        ))}
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={leverage}
                                        onChange={(e) => setLeverage(Number(e.target.value))}
                                        className="w-full mt-2"
                                    />
                                </div>

                                {/* Trade Amount */}
                                <div className="space-y-2">
                                    <label htmlFor="trade-amount" className="text-sm font-medium">Size (Base Asset)</label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="trade-amount"
                                            type="number"
                                            placeholder="0.0"
                                            value={tradeAmount}
                                            onChange={(e) => setTradeAmount(e.target.value)}
                                            className="flex-1"
                                            min="0"
                                            step="0.01"
                                        />
                                        <span className="self-center text-sm text-muted-foreground w-20">
                                            {PERP_MARKETS.find((m) => m.index === perpMarketIndex)?.symbol.replace("-PERP", "")}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Position Size: {(parseFloat(tradeAmount) * leverage || 0).toFixed(4)} (with {leverage}x leverage)
                                    </p>
                                </div>

                                {/* Limit Price (for limit, takeProfit, stopLimit) */}
                                {(orderType === "limit" || orderType === "takeProfit" || orderType === "stopLimit") && (
                                    <div className="space-y-2">
                                        <label htmlFor="limit-price" className="text-sm font-medium">
                                            {orderType === "limit" ? "Limit Price" : "Execution Price"}
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="limit-price"
                                                type="number"
                                                placeholder="0.00"
                                                value={limitPrice}
                                                onChange={(e) => setLimitPrice(e.target.value)}
                                                className="flex-1"
                                                min="0"
                                                step="0.01"
                                            />
                                            <span className="self-center text-sm text-muted-foreground w-16">USD</span>
                                        </div>
                                    </div>
                                )}

                                {/* Trigger Price (for takeProfit, stopLimit) */}
                                {(orderType === "takeProfit" || orderType === "stopLimit") && (
                                    <div className="space-y-2">
                                        <label htmlFor="trigger-price" className="text-sm font-medium">Trigger Price</label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="trigger-price"
                                                type="number"
                                                placeholder="0.00"
                                                value={triggerPrice}
                                                onChange={(e) => setTriggerPrice(e.target.value)}
                                                className="flex-1"
                                                min="0"
                                                step="0.01"
                                            />
                                            <span className="self-center text-sm text-muted-foreground w-16">USD</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Order will trigger when price {orderType === "takeProfit"
                                                ? (tradeDirection === "long" ? "rises above" : "falls below")
                                                : (tradeDirection === "long" ? "falls below" : "rises above")
                                            } this level
                                        </p>
                                    </div>
                                )}

                                {/* Scale Order Fields */}
                                {orderType === "scale" && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label htmlFor="scale-start" className="text-sm font-medium">Start Price</label>
                                                <Input
                                                    id="scale-start"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={scaleStartPrice}
                                                    onChange={(e) => setScaleStartPrice(e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="scale-end" className="text-sm font-medium">End Price</label>
                                                <Input
                                                    id="scale-end"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={scaleEndPrice}
                                                    onChange={(e) => setScaleEndPrice(e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="scale-count" className="text-sm font-medium">Number of Orders</label>
                                            <Input
                                                id="scale-count"
                                                type="number"
                                                placeholder="5"
                                                value={scaleOrderCount}
                                                onChange={(e) => setScaleOrderCount(e.target.value)}
                                                min="2"
                                                max="20"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Each order: {(() => {
                                                    const count = parseInt(scaleOrderCount);
                                                    if (isNaN(count) || count <= 0) return "0.0000";
                                                    const amount = parseFloat(tradeAmount) * leverage;
                                                    return isFinite(amount / count) ? (amount / count).toFixed(4) : "0.0000";
                                                })()} units
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Order Options */}
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={reduceOnly}
                                            onChange={(e) => setReduceOnly(e.target.checked)}
                                            className="rounded"
                                        />
                                        Reduce Only
                                    </label>
                                    {orderType === "limit" && (
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={postOnly}
                                                onChange={(e) => setPostOnly(e.target.checked)}
                                                className="rounded"
                                            />
                                            Post Only
                                        </label>
                                    )}
                                </div>

                                {/* Pre-Trade Info */}
                                {tradeDetails && (
                                    <div className="rounded-lg border p-3 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Margin Required</span>
                                            <span className={`font-mono font-medium ${tradeDetails.canAfford ? "" : "text-red-500"}`}>
                                                ${tradeDetails.requiredMargin?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Order Size</span>
                                            <span className="font-mono font-medium">
                                                {(parseFloat(tradeAmount) * leverage || 0).toFixed(2)} {PERP_MARKETS.find((m) => m.index === perpMarketIndex)?.symbol.replace("-PERP", "") ?? ""}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Liquidation Price</span>
                                            <span className="font-mono font-medium">
                                                {tradeDetails.liquidationPrice
                                                    ? `$${tradeDetails.liquidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : "None"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Position</span>
                                            <span className="font-mono font-medium">
                                                ${tradeDetails.positionValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Fees ({orderType === "market" ? "Taker" : "Maker"})</span>
                                            <span className="font-mono font-medium">
                                                ${tradeDetails.estimatedFee?.toFixed(4) ?? "0.00"}
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    ({(tradeDetails.feeRate * 100).toFixed(2)}%)
                                                </span>
                                            </span>
                                        </div>

                                        {!tradeDetails.canAfford && (
                                            <p className="text-xs text-red-500 pt-1">
                                                Insufficient margin — ${tradeDetails.freeCollateral?.toFixed(2)} free, need ${tradeDetails.requiredMargin?.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Place Order Button */}
                                <Button
                                    onClick={handlePlaceOrder}
                                    disabled={isLoading}
                                    className={`w-full ${tradeDirection === "long"
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-red-600 hover:bg-red-700"
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            {tradeDirection === "long" ? (
                                                <TrendingUp className="h-4 w-4 mr-2" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 mr-2" />
                                            )}
                                            {`${tradeDirection.toUpperCase()} ${(parseFloat(tradeAmount) * leverage || 0).toFixed(4)} ${PERP_MARKETS.find((m) => m.index === perpMarketIndex)?.symbol}`}
                                        </>
                                    )}
                                </Button>

                                {tradeTx && (
                                    <div className="text-sm p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                        <span className="text-green-600 dark:text-green-400">✓ Order placed! </span>
                                        <a
                                            href={tradeTx}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            View on Solscan ↗
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* ─── Account Overview: Positions, Balances, Orders ─── */}
                            <div className="col-span-1 md:col-span-3 space-y-4">
                                {/* Active Perp Positions */}
                                {(() => {
                                    const positions = getPositions();
                                    if (positions.length === 0) return null;
                                    return (
                                        <div className="rounded-lg border p-4 space-y-3">
                                            <h3 className="font-semibold">Active Positions</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b text-muted-foreground text-xs">
                                                            <th className="text-left py-2">Market</th>
                                                            <th className="text-left py-2">Side</th>
                                                            <th className="text-right py-2">Size</th>
                                                            <th className="text-right py-2">Entry</th>
                                                            <th className="text-right py-2">Mark</th>
                                                            <th className="text-right py-2">Liq. Price</th>
                                                            <th className="text-right py-2">uPnL</th>
                                                            <th className="text-right py-2">Notional</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {positions.map((pos) => (
                                                            <tr key={pos.marketIndex} className="border-b last:border-0">
                                                                <td className="py-2 font-medium">{pos.marketName}</td>
                                                                <td className={`py-2 font-medium ${pos.direction === "long" ? "text-green-500" : pos.direction === "short" ? "text-red-500" : ""}`}>
                                                                    {pos.direction.toUpperCase()}
                                                                </td>
                                                                <td className="py-2 text-right font-mono">{pos.size.toFixed(4)}</td>
                                                                <td className="py-2 text-right font-mono">${pos.entryPrice.toFixed(2)}</td>
                                                                <td className="py-2 text-right font-mono">${pos.markPrice.toFixed(2)}</td>
                                                                <td className="py-2 text-right font-mono">
                                                                    {pos.liquidationPrice ? `$${pos.liquidationPrice.toFixed(2)}` : "—"}
                                                                </td>
                                                                <td className={`py-2 text-right font-mono ${pos.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                                    {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
                                                                </td>
                                                                <td className="py-2 text-right font-mono">${pos.notionalValue.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Spot Balances */}
                                {(() => {
                                    const balances = getSpotBalances();
                                    if (balances.length === 0) return null;
                                    return (
                                        <div className="rounded-lg border p-4 space-y-3">
                                            <h3 className="font-semibold">Spot Balances</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b text-muted-foreground text-xs">
                                                            <th className="text-left py-2">Token</th>
                                                            <th className="text-left py-2">Type</th>
                                                            <th className="text-right py-2">Balance</th>
                                                            <th className="text-right py-2">USD Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {balances.map((bal) => (
                                                            <tr key={bal.marketIndex} className="border-b last:border-0">
                                                                <td className="py-2 font-medium">{bal.symbol}</td>
                                                                <td className={`py-2 ${bal.balanceType === "deposit" ? "text-green-500" : "text-red-500"}`}>
                                                                    {bal.balanceType === "deposit" ? "Deposit" : "Borrow"}
                                                                </td>
                                                                <td className="py-2 text-right font-mono">{bal.balance.toFixed(bal.decimals > 6 ? 6 : bal.decimals)}</td>
                                                                <td className="py-2 text-right font-mono">${bal.balanceUsd.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* All Orders (Open + Filled + Cancelled) */}
                                {(() => {
                                    const orders = getAllOrders();
                                    if (orders.length === 0) return (
                                        <div className="rounded-lg border p-4">
                                            <h3 className="font-semibold mb-2">Order History</h3>
                                            <p className="text-sm text-muted-foreground">No orders found on this account.</p>
                                        </div>
                                    );

                                    const getStatusLabel = (status: any) => {
                                        if (status?.open) return "Open";
                                        if (status?.filled) return "Filled";
                                        if (status?.canceled) return "Cancelled";
                                        return "Init";
                                    };
                                    const getStatusColor = (status: any) => {
                                        if (status?.open) return "text-blue-500";
                                        if (status?.filled) return "text-green-500";
                                        if (status?.canceled) return "text-red-500";
                                        return "text-muted-foreground";
                                    };
                                    const getOrderTypeLabel = (ot: any) => {
                                        if (ot?.market) return "Market";
                                        if (ot?.limit) return "Limit";
                                        if (ot?.triggerMarket) return "Trigger Market";
                                        if (ot?.triggerLimit) return "Trigger Limit";
                                        if (ot?.oracle) return "Oracle";
                                        return "Unknown";
                                    };
                                    const getDirectionLabel = (dir: any) => {
                                        if (dir?.long) return "Long";
                                        if (dir?.short) return "Short";
                                        return "—";
                                    };
                                    const getDirectionColor = (dir: any) => {
                                        if (dir?.long) return "text-green-500";
                                        if (dir?.short) return "text-red-500";
                                        return "";
                                    };

                                    return (
                                        <div className="rounded-lg border p-4 space-y-3">
                                            <h3 className="font-semibold">Order History ({orders.length})</h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b text-muted-foreground text-xs">
                                                            <th className="text-left py-2">ID</th>
                                                            <th className="text-left py-2">Status</th>
                                                            <th className="text-left py-2">Type</th>
                                                            <th className="text-left py-2">Market</th>
                                                            <th className="text-left py-2">Side</th>
                                                            <th className="text-right py-2">Size</th>
                                                            <th className="text-right py-2">Filled</th>
                                                            <th className="text-right py-2">Price</th>
                                                            <th className="text-right py-2">Trigger</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {orders.map((order: any) => {
                                                            const marketMeta = PERP_MARKETS.find(m => m.index === order.marketIndex);
                                                            const size = bnToBase(order.baseAssetAmount);
                                                            const filled = bnToBase(order.baseAssetAmountFilled);
                                                            const price = bnToPrice(order.price);
                                                            const trigger = order.triggerPrice?.isZero?.() ? null : bnToPrice(order.triggerPrice);
                                                            return (
                                                                <tr key={order.orderId} className="border-b last:border-0">
                                                                    <td className="py-2 font-mono">#{order.orderId}</td>
                                                                    <td className={`py-2 font-medium ${getStatusColor(order.status)}`}>
                                                                        {getStatusLabel(order.status)}
                                                                    </td>
                                                                    <td className="py-2">{getOrderTypeLabel(order.orderType)}</td>
                                                                    <td className="py-2 font-medium">{marketMeta?.symbol ?? `PERP-${order.marketIndex}`}</td>
                                                                    <td className={`py-2 font-medium ${getDirectionColor(order.direction)}`}>
                                                                        {getDirectionLabel(order.direction)}
                                                                    </td>
                                                                    <td className="py-2 text-right font-mono">{size.toFixed(4)}</td>
                                                                    <td className="py-2 text-right font-mono">{filled.toFixed(4)}</td>
                                                                    <td className="py-2 text-right font-mono">
                                                                        {price > 0 ? `$${price.toFixed(2)}` : "Market"}
                                                                    </td>
                                                                    <td className="py-2 text-right font-mono">
                                                                        {trigger ? `$${trigger.toFixed(2)}` : "—"}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoDrift;