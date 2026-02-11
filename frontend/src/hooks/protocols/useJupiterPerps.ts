"use client";

import { useState, useCallback, useRef } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { IDL, type Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";
import type { Position, Custody, CustodyAccount } from "@/types/jupiter";
import { getOpenPositionsForWallet } from "@/adapters/jupiter/get-open-positions";
import {
  constructMarketOpenPositionTrade,
  constructMarketClosePositionTrade,
} from "@/adapters/jupiter/create-market-trade";
import { generatePositionPda } from "@/adapters/jupiter/generate-position-and-position-request-pda";
import {
  getBorrowFee,
  getHourlyBorrowRate,
  getBorrowApr,
} from "@/adapters/jupiter/get-borrow-fee-and-funding-rate";
import {
  JUPITER_PERPETUALS_PROGRAM_ID,
  CUSTODY_PUBKEY,
  RATE_POWER,
} from "@/utils/jupiter-constant";

/** Validate base58 Solana address (exclude EVM 0x addresses) */
const isValidSolanaAddress = (address: string): boolean => {
  if (!address || address.startsWith("0x")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

// ─── Types ──────────────────────────────────────────────────────────
export type JupiterCluster = "mainnet-beta" | "devnet";

export interface JupiterPerpsConfig {
  cluster: JupiterCluster;
  rpcUrl: string;
}

export interface OpenPositionResult {
  success: boolean;
  txSignature?: string;
  error?: string;
}

export interface PositionInfo {
  publicKey: PublicKey;
  account: Position;
}

export interface CustodyInfo {
  publicKey: PublicKey;
  account: Custody;
  symbol: string;
  borrowApr: number;
  hourlyBorrowRate: string;
}

// ─── Constants ──────────────────────────────────────────────────────
const CUSTODY_SYMBOLS: Record<string, string> = {
  [CUSTODY_PUBKEY.SOL]: "SOL",
  [CUSTODY_PUBKEY.BTC]: "BTC",
  [CUSTODY_PUBKEY.ETH]: "ETH",
  [CUSTODY_PUBKEY.USDC]: "USDC",
  [CUSTODY_PUBKEY.USDT]: "USDT",
};

const CUSTODY_MINTS: Record<string, PublicKey> = {
  SOL: NATIVE_MINT,
  BTC: new PublicKey("3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"), // wBTC
  ETH: new PublicKey("7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"), // wETH
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  USDT: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
};

const LEVERAGE_PRECISION = 10_000;
const MAX_SLIPPAGE_BPS = 300; // 3%

// ─── Hook ───────────────────────────────────────────────────────────
export function useJupiterPerps() {
  // ─ Privy
  const { wallets } = useWallets();

  // Find the first connected Solana wallet from Privy
  const privyWallet =
    wallets.find((w) => isValidSolanaAddress(w.address)) ?? null;

  // ─ State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [lastTradeResult, setLastTradeResult] =
    useState<OpenPositionResult | null>(null);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [custodies, setCustodies] = useState<CustodyInfo[]>([]);

  // ─ Refs
  const programRef = useRef<Program<Perpetuals> | null>(null);
  const connectionRef = useRef<Connection | null>(null);
  const configRef = useRef<JupiterPerpsConfig>({
    cluster: "mainnet-beta",
    rpcUrl:
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com",
  });

  // ─ Config getter
  const config = configRef.current;

  // ─── Initialize ─────────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (!privyWallet) {
      setError("No Solana wallet found. Link a Solana wallet in Privy first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const connection = new Connection(config.rpcUrl, "confirmed");
      connectionRef.current = connection;

      // Read-only provider (we'll sign through Privy separately)
      const dummyKeypair = Keypair.generate();
      const dummyWallet = {
        publicKey: dummyKeypair.publicKey,
        signTransaction: async <T extends Transaction | VersionedTransaction>(
          tx: T,
        ) => tx,
        signAllTransactions: async <
          T extends Transaction | VersionedTransaction,
        >(
          txs: T[],
        ) => txs,
      };
      const readOnlyProvider = new AnchorProvider(
        connection,
        dummyWallet as any,
        { commitment: "confirmed" },
      );

      const program = new Program<Perpetuals>(
        IDL,
        JUPITER_PERPETUALS_PROGRAM_ID,
        readOnlyProvider,
      );

      programRef.current = program;
      setIsInitialized(true);

      console.log("[Jupiter Perps] Initialized on", config.cluster);
    } catch (err: any) {
      console.error("[Jupiter Perps] Init failed:", err);
      setError(err.message || "Failed to initialize Jupiter Perps client");
    } finally {
      setIsLoading(false);
    }
  }, [privyWallet, config]);

  // ─── Disconnect ─────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    programRef.current = null;
    connectionRef.current = null;
    setIsInitialized(false);
    setPositions([]);
    setCustodies([]);
    setError(null);
    setTradeError(null);
    setLastTradeResult(null);
  }, []);

  // ─── Fetch Custodies (pool tokens + funding info) ───────────────
  const fetchCustodies = useCallback(async () => {
    if (!programRef.current) {
      setError("Client not initialized");
      return [];
    }

    try {
      const custodyPubkeys = Object.values(CUSTODY_PUBKEY).map(
        (pk) => new PublicKey(pk),
      );

      const fetched: CustodyInfo[] = [];

      for (const pk of custodyPubkeys) {
        try {
          const account = await programRef.current.account.custody.fetch(pk);

          const symbol = CUSTODY_SYMBOLS[pk.toString()] || "???";
          const borrowApr = getBorrowApr(account);
          const hourlyRate = getHourlyBorrowRate(account);
          const hourlyBorrowRate = (
            (hourlyRate.toNumber() / RATE_POWER.toNumber()) *
            100
          ).toFixed(6);

          fetched.push({
            publicKey: pk,
            account,
            symbol,
            borrowApr,
            hourlyBorrowRate,
          });
        } catch (e) {
          console.warn(`Failed to fetch custody ${pk.toString()}:`, e);
        }
      }

      setCustodies(fetched);
      return fetched;
    } catch (err: any) {
      console.error("[Jupiter Perps] Fetch custodies failed:", err);
      setError(err.message || "Failed to fetch custodies");
      return [];
    }
  }, []);

  // ─── Fetch Open Positions ──────────────────────────────────────
  const fetchPositions = useCallback(async () => {
    if (!privyWallet) {
      setError("Wallet not connected");
      return [];
    }

    try {
      const result = await getOpenPositionsForWallet(privyWallet.address);
      setPositions(result);
      return result;
    } catch (err: any) {
      console.error("[Jupiter Perps] Fetch positions failed:", err);
      setError(err.message || "Failed to fetch positions");
      return [];
    }
  }, [privyWallet]);

  // ─── Open Position ─────────────────────────────────────────────
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
      setLastTradeResult(null);

      try {
        const owner = new PublicKey(privyWallet.address);
        const program = programRef.current;
        const connection = connectionRef.current;

        // Resolve custody pubkeys
        const custodyPk = new PublicKey(
          CUSTODY_PUBKEY[targetSymbol as keyof typeof CUSTODY_PUBKEY],
        );
        const collateralCustodyPk = new PublicKey(
          CUSTODY_PUBKEY[collateralSymbol as keyof typeof CUSTODY_PUBKEY],
        );

        // Fetch custody accounts
        const custodyAccount = await program.account.custody.fetch(custodyPk);
        const collateralCustodyAccount = await program.account.custody.fetch(
          collateralCustodyPk,
        );

        // Input mint
        const inputMint = CUSTODY_MINTS[collateralSymbol] || NATIVE_MINT;

        // Side enum
        const sideEnum = side === "long" ? { long: {} } : { short: {} };

        // Generate position PDA
        const { position: positionPubkey } = generatePositionPda({
          custody: custodyPk,
          collateralCustody: collateralCustodyPk,
          walletAddress: owner,
          side,
        });

        // Convert amounts to BN
        const collateralDecimals = collateralSymbol === "SOL" ? 9 : 6;
        const collateralTokenDelta = new BN(
          Math.floor(collateralAmount * 10 ** collateralDecimals),
        );
        const sizeUsdDelta = new BN(Math.floor(sizeUsd * 10 ** 6));

        // Slippage (3%)
        const priceSlippage = new BN(MAX_SLIPPAGE_BPS * 100); // BPS * 100

        const { blockhash } = await connection.getLatestBlockhash("confirmed");

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
          inputMint,
          jupiterMinimumOut: null,
          owner,
          priceSlippage,
          program,
          recentBlockhash: blockhash,
          side: sideEnum as Position["side"],
          sizeUsdDelta,
          positionPubkey,
        });

        // Sign via Privy — serialize to Uint8Array, sign, deserialize back
        const serializedTx = tx.serialize();
        const result = await privyWallet.signTransaction({
          transaction: serializedTx,
        });
        const signedBytes = new Uint8Array(result.signedTransaction);
        const signedTx = VersionedTransaction.deserialize(signedBytes);

        // Send
        const txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: true, maxRetries: 3 },
        );

        await connection.confirmTransaction(txSignature, "confirmed");

        setLastTradeResult({ success: true, txSignature });
        console.log("[Jupiter Perps] Position opened:", txSignature);

        // Refresh positions
        await fetchPositions();
      } catch (err: any) {
        console.error("[Jupiter Perps] Open position failed:", err);
        const msg = err?.message || "Failed to open position";
        setTradeError(msg);
        setLastTradeResult({ success: false, error: msg });
      } finally {
        setIsTrading(false);
      }
    },
    [privyWallet, fetchPositions],
  );

  // ─── Close Position ────────────────────────────────────────────
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
      setLastTradeResult(null);

      try {
        const program = programRef.current;
        const connection = connectionRef.current;
        const desiredMint = CUSTODY_MINTS[desiredMintSymbol] || NATIVE_MINT;

        const priceSlippage = new BN(MAX_SLIPPAGE_BPS * 100);
        const { blockhash } = await connection.getLatestBlockhash("confirmed");

        const tx = await constructMarketClosePositionTrade({
          desiredMint,
          program,
          recentBlockhash: blockhash,
          positionPubkey,
          priceSlippage,
          jupiterMinimumOut: null,
        });

        // Sign via Privy
        const serializedTx = tx.serialize();
        const result = await privyWallet.signTransaction({
          transaction: serializedTx,
        });
        const signedBytes = new Uint8Array(result.signedTransaction);
        const signedTx = VersionedTransaction.deserialize(signedBytes);

        const txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          { skipPreflight: true, maxRetries: 3 },
        );

        await connection.confirmTransaction(txSignature, "confirmed");

        setLastTradeResult({ success: true, txSignature });
        console.log("[Jupiter Perps] Position closed:", txSignature);

        await fetchPositions();
      } catch (err: any) {
        console.error("[Jupiter Perps] Close position failed:", err);
        const msg = err?.message || "Failed to close position";
        setTradeError(msg);
        setLastTradeResult({ success: false, error: msg });
      } finally {
        setIsTrading(false);
      }
    },
    [privyWallet, fetchPositions],
  );

  // ─── Get Borrow Fee for Position ───────────────────────────────
  const fetchBorrowFee = useCallback(
    async (positionPubkey: PublicKey | string) => {
      try {
        const curtime = new BN(Math.floor(Date.now() / 1000));
        await getBorrowFee(positionPubkey, curtime);
      } catch (err: any) {
        console.error("[Jupiter Perps] Borrow fee fetch failed:", err);
      }
    },
    [],
  );

  // ─── Return ───────────────────────────────────────────────────
  return {
    // State
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

    // Actions
    initialize,
    disconnect,
    fetchPositions,
    fetchCustodies,
    openPosition,
    closePosition,
    fetchBorrowFee,
  };
}
