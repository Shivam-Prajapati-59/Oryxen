"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { IDL, type Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";
import type { Custody, CustodyAccount } from "@/features/jupiter/types";
import {
  getHourlyBorrowRate,
  getBorrowApr,
  getBorrowFee,
} from "@/features/jupiter/adapter/get-borrow-fee-and-funding-rate";
import {
  CUSTODY_PUBKEY,
  CUSTODY_MINTS,
  JUPITER_PERPETUALS_PROGRAM_ID,
  getTokenDecimals,
} from "@/features/jupiter/constants";
import {
  createPrivyWalletAdapter,
  isValidSolanaAddress,
  parseTokenAmount,
} from "@/lib/solana";
import { getCustodyData } from "@/features/jupiter/adapter/get-custody-data";
import {
  constructMarketOpenPositionTrade,
  constructMarketClosePositionTrade,
} from "@/features/jupiter/adapter/create-market-trade";
import { generatePositionPda } from "@/features/jupiter/adapter/generate-position-and-position-request-pda";
import { getOpenPositionsForWallet } from "@/features/jupiter/adapter/get-open-positions";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  getDynamicPriceSlippage,
  getJupiterMinimumOut,
} from "@/features/jupiter/utils";
import { SOLANA_MAINNET_RPC } from "@/config/env";

// ─── Helpers ──────────────────────────────────────────────────────

/** Default timeout for transaction confirmation (60 seconds) */
const TX_CONFIRM_TIMEOUT_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────

export interface JupiterPerpsConfig {
  cluster: "mainnet-beta";
  rpcUrl: string;
}

export interface CustodyInfo {
  publicKey: PublicKey;
  account: Custody;
  symbol: string;
  borrowApr: number;
  hourlyBorrowRate: number;
}

export interface OpenPositionResult {
  success: boolean;
  txSignature?: string;
  error?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useJupiter() {
  // ─ Privy Wallet Access
  const { wallets } = useWallets();
  const privyWallet =
    wallets.find((w) => isValidSolanaAddress(w.address)) ?? null;

  // ─ State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custodies, setCustodies] = useState<CustodyInfo[]>([]);

  // - Trade States
  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [lastTradeResult, setLastTradeResult] =
    useState<OpenPositionResult | null>(null);

  // - Positions State
  const [positions, setPositions] = useState<any[]>([]);

  // ─ Refs
  const programRef = useRef<Program<Perpetuals> | null>(null);
  const connectionRef = useRef<Connection | null>(null);
  const providerRef = useRef<AnchorProvider | null>(null);
  const configRef = useRef<JupiterPerpsConfig>({
    cluster: "mainnet-beta",
    rpcUrl: SOLANA_MAINNET_RPC,
  });

  const config = configRef.current;

  // ── Computed state
  const isInitialized = !!programRef.current;

  // 1. Initialize Client & Program
  const initialize = useCallback(async () => {
    if (!privyWallet) {
      console.log("Waiting for wallet to initialize Jupiter Client...");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const connection = new Connection(config.rpcUrl, "confirmed");
      connectionRef.current = connection;

      const anchorWallet = createPrivyWalletAdapter(privyWallet, config.rpcUrl);

      const provider = new AnchorProvider(connection, anchorWallet as any, {
        commitment: "confirmed",
        skipPreflight: true,
      });
      providerRef.current = provider;

      const program = new Program(IDL, JUPITER_PERPETUALS_PROGRAM_ID, provider);
      programRef.current = program;

      console.log("[Jupiter Perps] Program Initialized");
    } catch (err: any) {
      console.error("[Jupiter Perps] Init failed:", err);
      setError(err.message || "Failed to initialize Jupiter Perps client");
    } finally {
      setIsLoading(false);
    }
  }, [privyWallet, config]);

  // Disconnect / reset
  const disconnect = useCallback(() => {
    programRef.current = null;
    connectionRef.current = null;
    providerRef.current = null;
    setCustodies([]);
    setPositions([]);
    setError(null);
    setTradeError(null);
    setLastTradeResult(null);
  }, []);

  // 2. Fetch all custody accounts
  const fetchCustodies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const custodyData = await getCustodyData(programRef.current ?? undefined);

      const formattedCustodies: CustodyInfo[] = custodyData.map((c) => ({
        publicKey: c.publicKey,
        account: c.account,
        symbol: c.symbol,
        borrowApr: getBorrowApr(c.account),
        hourlyBorrowRate: getHourlyBorrowRate(c.account).toNumber(),
      }));

      setCustodies(formattedCustodies);
    } catch (err: any) {
      console.error("Failed to Fetch custody Data:", err);
      setError(err.message || "Failed to Fetch custody Data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. Fetch open positions for the connected wallet
  const fetchPositions = useCallback(async () => {
    if (!privyWallet) return;
    try {
      const openPositions = await getOpenPositionsForWallet(
        privyWallet.address,
        connectionRef.current ?? undefined,
        programRef.current ?? undefined,
      );
      setPositions(openPositions);
    } catch (err: any) {
      console.error("Failed to fetch positions:", err);
    }
  }, [privyWallet]);

  // 4. Open Position for Market
  const openPosition = useCallback(
    async ({
      targetSymbol,
      collateralSymbol,
      side,
      sizeUsd,
      collateralAmount,
      leverageMultiplier,
    }: {
      targetSymbol: string;
      collateralSymbol: string;
      side: "long" | "short";
      sizeUsd: number;
      collateralAmount: number;
      leverageMultiplier: number;
    }) => {
      if (!programRef.current || !connectionRef.current || !privyWallet) {
        setTradeError("Client not initialized or wallet not connected");
        return;
      }

      setIsTrading(true);
      setTradeError(null);

      try {
        const owner = new PublicKey(privyWallet.address);
        const program = programRef.current;
        const connection = connectionRef.current;

        if (!(targetSymbol in CUSTODY_PUBKEY)) {
          throw new Error(
            `Invalid target symbol "${targetSymbol}". Valid symbols: ${Object.keys(
              CUSTODY_PUBKEY,
            ).join(", ")}`,
          );
        }
        if (!(collateralSymbol in CUSTODY_PUBKEY)) {
          throw new Error(
            `Invalid collateral symbol "${collateralSymbol}". Valid symbols: ${Object.keys(
              CUSTODY_PUBKEY,
            ).join(", ")}`,
          );
        }

        const targetCustodyKey =
          CUSTODY_PUBKEY[targetSymbol as keyof typeof CUSTODY_PUBKEY];
        const collateralCustodyKey =
          CUSTODY_PUBKEY[collateralSymbol as keyof typeof CUSTODY_PUBKEY];

        const custodyPk = new PublicKey(targetCustodyKey);
        const collateralCustodyPk = new PublicKey(collateralCustodyKey);

        if (!CUSTODY_MINTS.hasOwnProperty(collateralSymbol)) {
          throw new Error(
            `No mint mapping for collateral symbol "${collateralSymbol}". Valid symbols: ${Object.keys(
              CUSTODY_MINTS,
            ).join(", ")}`,
          );
        }
        const inputMint = CUSTODY_MINTS[collateralSymbol];

        const [custodyAccount, collateralCustodyAccount] = await Promise.all([
          program.account.custody.fetch(custodyPk),
          program.account.custody.fetch(collateralCustodyPk),
        ]);

        const collateralDecimals = getTokenDecimals(collateralSymbol);
        const collateralTokenDelta = parseTokenAmount(
          String(collateralAmount),
          collateralDecimals,
        );

        const effectiveSizeUsd = sizeUsd * leverageMultiplier;
        const sizeUsdDelta = parseTokenAmount(String(effectiveSizeUsd), 6);

        const priceSlippage = await getDynamicPriceSlippage(inputMint, side);

        const jupiterMinimumOut = await getJupiterMinimumOut(
          inputMint,
          custodyAccount.mint,
          collateralTokenDelta,
        );

        const { position: positionPubkey } = generatePositionPda({
          custody: custodyPk,
          collateralCustody: collateralCustodyPk,
          walletAddress: owner,
          side,
        });

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");

        const tx = await constructMarketOpenPositionTrade({
          custody: {
            publicKey: custodyPk,
            account: custodyAccount,
          } as CustodyAccount,
          collateralCustody: {
            publicKey: collateralCustodyPk,
            account: collateralCustodyAccount,
          } as CustodyAccount,
          collateralTokenDelta,
          connection,
          inputMint,
          jupiterMinimumOut,
          owner,
          priceSlippage,
          program,
          recentBlockhash: blockhash,
          side: side === "long" ? { long: {} } : { short: {} },
          sizeUsdDelta,
          positionPubkey,
        });

        const signedTx = await providerRef.current!.wallet.signTransaction(tx);

        const txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: true, maxRetries: 3 },
        );

        const confirmPromise = connection.confirmTransaction(
          { signature: txSignature, blockhash, lastValidBlockHeight },
          "confirmed",
        );

        let openTimeoutId: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<never>((_, reject) => {
          openTimeoutId = setTimeout(
            () =>
              reject(
                new Error(
                  `Transaction confirmation timed out after ${
                    TX_CONFIRM_TIMEOUT_MS / 1000
                  }s. Signature: ${txSignature}`,
                ),
              ),
            TX_CONFIRM_TIMEOUT_MS,
          );
        });

        let confirmResult;
        try {
          confirmResult = await Promise.race([confirmPromise, timeoutPromise]);
        } finally {
          clearTimeout(openTimeoutId!);
        }
        if (confirmResult.value?.err) {
          throw new Error(
            `Transaction failed on-chain: ${JSON.stringify(
              confirmResult.value.err,
            )}`,
          );
        }

        console.log("[Jupiter Perps] Trade Success:", txSignature);
        setLastTradeResult({ success: true, txSignature });
        await fetchPositions();
      } catch (err: any) {
        console.error("[Jupiter Perps] Trade Failed:", err);
        const message = err.message || "Failed to open position";
        setTradeError(message);
        setLastTradeResult({ success: false, error: message });
      } finally {
        setIsTrading(false);
      }
    },
    [privyWallet, fetchPositions],
  );

  // 5. Close Position
  const closePosition = useCallback(
    async ({
      positionPubkey,
      desiredMintSymbol,
    }: {
      positionPubkey: PublicKey;
      desiredMintSymbol: string;
    }) => {
      if (!programRef.current || !connectionRef.current || !privyWallet) {
        setTradeError("Client not initialized or wallet not connected");
        return;
      }

      setIsTrading(true);
      setTradeError(null);

      try {
        const program = programRef.current;
        const connection = connectionRef.current;

        if (!CUSTODY_MINTS.hasOwnProperty(desiredMintSymbol)) {
          throw new Error(
            `Invalid desiredMintSymbol "${desiredMintSymbol}". Valid symbols: ${Object.keys(
              CUSTODY_MINTS,
            ).join(", ")}`,
          );
        }
        const desiredMint = CUSTODY_MINTS[desiredMintSymbol];

        const positionAccount = await program.account.position.fetch(
          positionPubkey,
        );
        const positionSide: "long" | "short" = positionAccount.side.long
          ? "long"
          : "short";
        const priceSlippage = await getDynamicPriceSlippage(
          desiredMint,
          positionSide,
        );

        const jupiterMinimumOut: BN | null = null;

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");

        const tx = await constructMarketClosePositionTrade({
          connection,
          desiredMint,
          program,
          recentBlockhash: blockhash,
          positionPubkey,
          priceSlippage,
          jupiterMinimumOut,
        });

        const signedTx = await providerRef.current!.wallet.signTransaction(tx);

        const txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: true, maxRetries: 3 },
        );

        const confirmPromise = connection.confirmTransaction(
          { signature: txSignature, blockhash, lastValidBlockHeight },
          "confirmed",
        );

        let closeTimeoutId: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<never>((_, reject) => {
          closeTimeoutId = setTimeout(
            () =>
              reject(
                new Error(
                  `Close confirmation timed out after ${
                    TX_CONFIRM_TIMEOUT_MS / 1000
                  }s. Signature: ${txSignature}`,
                ),
              ),
            TX_CONFIRM_TIMEOUT_MS,
          );
        });

        let confirmResult;
        try {
          confirmResult = await Promise.race([confirmPromise, timeoutPromise]);
        } finally {
          clearTimeout(closeTimeoutId!);
        }
        if (confirmResult.value?.err) {
          throw new Error(
            `Close transaction failed on-chain: ${JSON.stringify(
              confirmResult.value.err,
            )}`,
          );
        }

        console.log("[Jupiter Perps] Close Success:", txSignature);
        setLastTradeResult({ success: true, txSignature });
        await fetchPositions();
      } catch (err: any) {
        console.error("[Jupiter Perps] Close Failed:", err);
        const message = err.message || "Failed to close position";
        setTradeError(message);
        setLastTradeResult({ success: false, error: message });
      } finally {
        setIsTrading(false);
      }
    },
    [privyWallet, fetchPositions],
  );

  // 6. Fetch borrow fee for a position
  const fetchBorrowFee = useCallback(
    async (positionPubkey: PublicKey | string, curtime: BN) => {
      try {
        const fee = await getBorrowFee(
          positionPubkey,
          curtime,
          programRef.current ?? undefined,
        );
        return fee;
      } catch (err: any) {
        console.error("[Jupiter Perps] fetchBorrowFee failed:", err);
        throw err;
      }
    },
    [],
  );

  // Effect to trigger initialization when wallet is ready
  useEffect(() => {
    if (privyWallet && !programRef.current) {
      initialize();
    }
  }, [privyWallet, initialize]);

  return {
    // Actions
    initialize,
    disconnect,
    fetchCustodies,
    fetchPositions,
    openPosition,
    closePosition,
    fetchBorrowFee,
    // State
    isInitialized,
    custodies,
    positions,
    isLoading,
    isTrading,
    error,
    tradeError,
    lastTradeResult,
    config,
    privyWallet,
    program: programRef.current,
    connection: connectionRef.current,
  };
}
