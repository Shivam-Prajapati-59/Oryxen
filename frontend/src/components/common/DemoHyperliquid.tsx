"use client";
import React, { useState } from "react";
import { useHyperLiquid } from "@/hooks/useHyperLiquid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

const DemoHyperliquid = () => {
    const {
        isInitialized,
        userExists,
        userState,
        balanceInfo,
        walletAddress,
        loading,
        error,
        orderSuccess,
        initializeHyperliquid,
        fetchBalances,
        placeOrder,
        fetchAssetDetails,
    } = useHyperLiquid();

    // Order form state
    const [coin, setCoin] = useState("BTC");
    const [isBuy, setIsBuy] = useState(true);
    const [size, setSize] = useState("");
    const [price, setPrice] = useState("");
    const [orderType, setOrderType] = useState<"Limit" | "Market">("Limit");
    const [orderLoading, setOrderLoading] = useState(false);

    const handlePlaceOrder = async () => {
        if (!size || !price) {
            return;
        }

        setOrderLoading(true);
        try {
            await placeOrder({
                coin,
                isBuy,
                sz: size,
                limitPx: price,
                orderType,
                reduceOnly: false,
            });

            // Clear form on success
            setSize("");
            setPrice("");
        } catch (err) {
            console.error("Order failed:", err);
        } finally {
            setOrderLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-6 w-6" />
                        Hyperliquid Demo
                    </CardTitle>
                    <CardDescription>
                        View your Hyperliquid account details and balances
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Success Display */}
                    {orderSuccess && (
                        <Alert className="bg-green-50 border-green-200">
                            <AlertDescription className="text-green-800">
                                {orderSuccess}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Initializing Hyperliquid...</span>
                        </div>
                    )}

                    {/* Connection Status */}
                    <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div>
                            <p className="text-sm font-medium">Connection Status</p>
                            <p className="text-xs text-muted-foreground">
                                {isInitialized ? "Connected" : "Not Connected"}
                            </p>
                        </div>
                        <div
                            className={`h-3 w-3 rounded-full ${isInitialized ? "bg-green-500" : "bg-red-500"
                                }`}
                        />
                    </div>

                    {/* Wallet Address */}
                    {walletAddress && (
                        <div className="p-4 bg-secondary rounded-lg">
                            <p className="text-sm font-medium mb-1">Wallet Address</p>
                            <p className="text-xs font-mono break-all">{walletAddress}</p>
                        </div>
                    )}

                    {/* Balances Section */}
                    {balanceInfo && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Balances</h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={fetchBalances}
                                    disabled={loading}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Native Balance */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">
                                            Arbitrum Sepolia ETH
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            {parseFloat(balanceInfo.nativeBalance).toFixed(6)} ETH
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Wallet USDC Balance */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">
                                            Wallet USDC Balance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            ${parseFloat(balanceInfo.walletUsdcBalance).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* USDC Balance */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">
                                            Hyperliquid USDC (Testnet)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            ${parseFloat(balanceInfo.usdcBalance).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Account Value */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">
                                            Account Value
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            ${parseFloat(balanceInfo.accountValue).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Withdrawable */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">
                                            Withdrawable
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl font-bold">
                                            ${parseFloat(balanceInfo.withdrawable).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* User State Details */}
                    {userState && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold">Margin Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Margin Used</p>
                                    <p className="text-lg font-semibold">
                                        ${parseFloat(userState.marginSummary?.totalMarginUsed || "0").toFixed(2)}
                                    </p>
                                </div>
                                <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Notional Position</p>
                                    <p className="text-lg font-semibold">
                                        ${parseFloat(userState.marginSummary?.totalNtlPos || "0").toFixed(2)}
                                    </p>
                                </div>
                                <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm text-muted-foreground">Open Positions</p>
                                    <p className="text-lg font-semibold">
                                        {userState.assetPositions?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User Status */}
                    {isInitialized && !userExists && (
                        <Alert>
                            <AlertDescription>
                                No trading history found. This wallet hasn&apos;t made any deposits or trades on
                                Hyperliquid testnet yet.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Initialize Button */}
                    {!isInitialized && !loading && (
                        <Button
                            onClick={initializeHyperliquid}
                            className="w-full"
                            size="lg"
                        >
                            Connect to Hyperliquid
                        </Button>
                    )}

                    {/* Order Placement Section */}
                    {isInitialized && userExists && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Place Order</CardTitle>
                                <CardDescription>
                                    Execute trades on Hyperliquid testnet
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Coin Selection */}
                                    <div className="space-y-2">
                                        <Label htmlFor="coin">Asset</Label>
                                        <Select value={coin} onValueChange={setCoin}>
                                            <SelectTrigger id="coin">
                                                <SelectValue placeholder="Select asset" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BTC">BTC</SelectItem>
                                                <SelectItem value="ETH">ETH</SelectItem>
                                                <SelectItem value="SOL">SOL</SelectItem>
                                                <SelectItem value="ARB">ARB</SelectItem>
                                                <SelectItem value="AVAX">AVAX</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Order Type */}
                                    <div className="space-y-2">
                                        <Label htmlFor="orderType">Order Type</Label>
                                        <Select value={orderType} onValueChange={(val) => setOrderType(val as "Limit" | "Market")}>
                                            <SelectTrigger id="orderType">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Limit">Limit</SelectItem>
                                                <SelectItem value="Market">Market</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Size Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="size">Size</Label>
                                        <Input
                                            id="size"
                                            type="number"
                                            placeholder="0.001"
                                            value={size}
                                            onChange={(e) => setSize(e.target.value)}
                                            step="0.001"
                                            min="0"
                                        />
                                    </div>

                                    {/* Price Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="price">
                                            {orderType === "Limit" ? "Limit Price" : "Slippage Price"}
                                        </Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            placeholder="50000"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* Buy/Sell Buttons */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        onClick={() => {
                                            setIsBuy(true);
                                            handlePlaceOrder();
                                        }}
                                        disabled={orderLoading || !size || !price}
                                        className="bg-green-600 hover:bg-green-700"
                                        size="lg"
                                    >
                                        {orderLoading && isBuy ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <TrendingUp className="h-4 w-4 mr-2" />
                                        )}
                                        Buy {coin}
                                    </Button>

                                    <Button
                                        onClick={() => {
                                            setIsBuy(false);
                                            handlePlaceOrder();
                                        }}
                                        disabled={orderLoading || !size || !price}
                                        className="bg-red-600 hover:bg-red-700"
                                        size="lg"
                                    >
                                        {orderLoading && !isBuy ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 mr-2" />
                                        )}
                                        Sell {coin}
                                    </Button>
                                </div>

                                {orderType === "Market" && (
                                    <Alert>
                                        <AlertDescription className="text-sm">
                                            Market orders execute immediately at best available price.
                                            Set a slippage price to protect against extreme price movements.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DemoHyperliquid;