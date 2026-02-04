"use client";
import { useCallback, useState, useEffect, useMemo } from "react";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { HttpTransport, ExchangeClient, InfoClient } from "@nktkas/hyperliquid";
import {
  UserState,
  BalanceInfo,
  SelectedAsset,
  OrderParams,
  OrderResponse,
} from "@/types/hyperliquid";

// Chain IDs
const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// USDC Contract Addresses
const USDC_ARBITRUM_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export const useHyperLiquid = () => {
  // --- Client State ---
  const [exchangeClient, setExchangeClient] = useState<ExchangeClient | null>(
    null,
  );
  const [infoClient, setInfoClient] = useState<InfoClient | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // --- UI/Status State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Account Data ---
  const [userState, setUserState] = useState<UserState | null>(null);
  const [userExists, setUserExists] = useState<boolean>(false);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // --- Asset Details ---
  const [selectedAssetDetails, setSelectedAssetDetails] =
    useState<SelectedAsset | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const { wallets } = useWallets();
  const isTestnet = true; // Toggle this based on your environment config

  // 1. Embedded Wallet Selection
  const embeddedWallet = useMemo(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  }, [wallets]);

  // USDC Contract Address
  const usdcContractAddress = useMemo(() => {
    return isTestnet ? USDC_ARBITRUM_SEPOLIA : USDC_ARBITRUM;
  }, [isTestnet]);

  // Determine required Chain ID
  const requiredChainId = useMemo(() => {
    return isTestnet ? ARBITRUM_SEPOLIA_CHAIN_ID : ARBITRUM_CHAIN_ID;
  }, [isTestnet]);

  // Fetch Balances
  const fetchBalances = useCallback(async () => {
    if (!signer || !infoClient || !walletAddress) return;

    try {
      // Get native Arbitrum Sepolia balance
      const provider = signer.provider;
      if (!provider) return;

      const nativeBalance = await provider.getBalance(walletAddress);
      const nativeBalanceFormatted = ethers.formatEther(nativeBalance);

      // Get USDC balance from wallet (ERC20 contract)
      let walletUsdcBalance = "0";
      try {
        const usdcContract = new ethers.Contract(
          usdcContractAddress,
          ERC20_ABI,
          provider,
        );
        const balance = await usdcContract.balanceOf(walletAddress);
        const decimals = await usdcContract.decimals();
        walletUsdcBalance = ethers.formatUnits(balance, decimals);
      } catch (usdcError) {
        console.error("Error fetching wallet USDC balance:", usdcError);
      }

      // Get USDC balance from Hyperliquid user state
      let usdcBalance = "0";
      let accountValue = "0";
      let withdrawable = "0";

      if (userState) {
        // USDC balance is typically in the accountValue or totalRawUsd
        accountValue = userState.marginSummary?.accountValue || "0";
        withdrawable = userState.withdrawable || "0";
        usdcBalance = userState.crossMarginSummary?.totalRawUsd || accountValue;
      }

      setBalanceInfo({
        usdcBalance,
        walletUsdcBalance,
        nativeBalance: nativeBalanceFormatted,
        accountValue,
        withdrawable,
      });
    } catch (err) {
      console.error("Error fetching balances:", err);
    }
  }, [signer, infoClient, walletAddress, userState, usdcContractAddress]);

  // 2. Initialize HyperLiquid
  const initializeHyperliquid = useCallback(async () => {
    if (!embeddedWallet) return;

    setLoading(true);
    setError(null);

    try {
      // 2a. Chain Switching Logic
      const currentChainId = parseInt(
        embeddedWallet.chainId.split(":")[1] || "0",
      );
      if (currentChainId !== requiredChainId) {
        await embeddedWallet.switchChain(requiredChainId);
      }

      // 2b. Ethers Provider Setup
      const provider = await embeddedWallet.getEthereumProvider();
      if (!provider) throw new Error("Failed to get wallet provider");

      const ethersProvider = new ethers.BrowserProvider(provider);
      const ethSigner = await ethersProvider.getSigner();
      const signerAddress = await ethSigner.getAddress();
      setWalletAddress(signerAddress);

      // 2c. Hyperliquid Transport & Clients
      const transport = new HttpTransport({
        isTestnet: isTestnet,
        timeout: 10000,
        fetchOptions: { keepalive: false },
      });

      // Important: The SDK expects a specific wallet interface.
      // Ethers v6 signers usually work, but sometimes need casting.
      const client = new ExchangeClient({
        transport,
        wallet: ethSigner as unknown as ethers.Wallet,
        isTestnet: isTestnet,
      });

      const iClient = new InfoClient({ transport });

      setInfoClient(iClient);
      setSigner(ethSigner);
      setExchangeClient(client);
      setIsInitialized(true);

      // 2d. Fetch User State (Clearinghouse)
      try {
        const state = await iClient.clearinghouseState({ user: signerAddress });
        // Start monitoring state (optional polling could go here)
        if (state && state.marginSummary) {
          setUserState(state as unknown as UserState);
          setUserExists(true);
        }
      } catch (stateError) {
        console.warn("User has no history/deposits on Hyperliquid yet.");
        setUserExists(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Initialization failed";
      console.error(err);
      setError(errorMessage);
      setIsInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [embeddedWallet, requiredChainId, isTestnet]);

  // Auto-initialize when wallet is ready (Optional - remove if you want manual trigger)
  useEffect(() => {
    if (embeddedWallet && !isInitialized && !loading) {
      initializeHyperliquid();
    }
  }, [embeddedWallet, isInitialized, loading, initializeHyperliquid]);

  // Place Order Function
  const placeOrder = useCallback(
    async (orderParams: OrderParams) => {
      // 1. Validations
      if (!embeddedWallet) throw new Error("Wallet not connected");
      if (!exchangeClient) throw new Error("Exchange client not initialized");
      if (!infoClient) throw new Error("Info client not initialized");
      if (!userExists) {
        setError("User needs to deposit funds to Hyperliquid first.");
        return;
      }

      setLoading(true);
      setError(null);
      setOrderSuccess(null);

      try {
        const {
          coin,
          isBuy,
          sz,
          limitPx,
          orderType,
          reduceOnly = false,
        } = orderParams;

        // Validate inputs
        if (!coin || !sz || !limitPx) {
          throw new Error("Missing required order parameters");
        }

        const size = parseFloat(sz);
        const price = parseFloat(limitPx);

        if (isNaN(size) || isNaN(price) || size <= 0 || price <= 0) {
          throw new Error("Invalid size or price values");
        }

        // Fetch asset metadata to get asset index
        const meta = await infoClient.meta();
        const assetIndex = meta.universe.findIndex((u: any) => u.name === coin);

        if (assetIndex === -1) {
          throw new Error(`Asset ${coin} not found`);
        }

        // Build order request based on order type using correct SDK format
        let orderRequest: any;

        if (orderType === "Limit") {
          orderRequest = {
            a: assetIndex, // Asset index
            b: isBuy, // Buy side
            p: price.toString(), // Price
            s: size.toString(), // Size
            r: reduceOnly, // Reduce only
            t: { limit: { tif: "Gtc" } }, // Order type
          };
        } else {
          // Market order
          orderRequest = {
            a: assetIndex,
            b: isBuy,
            p: price.toString(),
            s: size.toString(),
            r: reduceOnly,
            t: { limit: { tif: "Ioc" } }, // Immediate or Cancel
          };
        }

        // Place the order
        const result = await exchangeClient.order({
          orders: [orderRequest],
          grouping: "na",
        });

        console.log("Order placed successfully:", result);

        const successMessage = `${orderType} ${
          isBuy ? "Buy" : "Sell"
        } order for ${sz} ${coin} placed successfully!`;
        setOrderSuccess(successMessage);

        // Refresh balances and user state after order
        if (infoClient && walletAddress) {
          try {
            const state = await infoClient.clearinghouseState({
              user: walletAddress,
            });
            if (state && state.marginSummary) {
              setUserState(state as unknown as UserState);
            }
          } catch (err) {
            console.warn("Error refreshing state:", err);
          }
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Order placement failed";
        console.error("Order error:", err);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [embeddedWallet, exchangeClient, infoClient, userExists, walletAddress],
  );

  // Fetch Asset Details
  const fetchAssetDetails = useCallback(
    async (coin: string) => {
      if (!infoClient) return;

      try {
        const meta = await infoClient.meta();
        const asset = meta.universe.find((u: any) => u.name === coin);

        if (asset) {
          setSelectedAssetDetails({
            name: asset.name,
            szDecimals: asset.szDecimals || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching asset details:", err);
      }
    },
    [infoClient],
  );

  // Fetch balances when user state changes
  useEffect(() => {
    if (isInitialized && walletAddress) {
      fetchBalances();
    }
  }, [isInitialized, walletAddress, userState, fetchBalances]);

  // Return everything needed by the UI
  return {
    // Clients & State
    exchangeClient,
    infoClient,
    userState,
    isInitialized,
    userExists,
    balanceInfo,
    walletAddress,
    selectedAssetDetails,
    orderSuccess,

    // Status
    loading,
    error,

    // Actions
    initializeHyperliquid,
    fetchBalances,
    placeOrder,
    fetchAssetDetails,
  };
};
