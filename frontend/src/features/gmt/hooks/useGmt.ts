/**
 * useGmt — React hook for GMTrade on Solana.
 *
 * Bridges the user's Privy-managed Solana wallet to the GMTrade (gmsol_store)
 * Anchor program. Follows the same pattern as `useFlash`, `useJupiter`, and
 * `useDrift`:
 *
 *   1. Get the Privy Solana wallet → `useWallets()`
 *   2. Wrap it via `createPrivyWalletAdapter()` from `lib/solana.ts`
 *   3. Create an `AnchorProvider` with that adapter
 *   4. Instantiate an Anchor `Program` with the gmsol_store IDL
 *   5. Call program instructions — Privy handles signing
 *
 * IMPORTANT: This hook provides the **structure** for all GMTrade operations.
 * The actual instruction-building code for each method requires matching the
 * exact Anchor accounts/args from the IDL. Since `gmsol_sdk` in Rust abstracts
 * PDA derivation heavily, some accounts (store PDA, user PDA, order PDA,
 * position PDA, escrow accounts) need to be derived manually in TypeScript.
 *
 * The SDK team at gmsol-labs is working on a JS/WASM SDK that would simplify
 * this. Until then, each instruction call needs careful PDA derivation.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
} from "@solana/spl-token";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { createPrivyWalletAdapter, isValidSolanaAddress } from "@/lib/solana";
import { IDL } from "@/lib/idl/gmsol-store-idl";
import {
  GMSOL_STORE_PROGRAM_ID,
  GMT_CONNECTION,
  GMT_CHAIN_PREFIX,
  GMT_NETWORK,
  GMT_PROGRAM,
  MARKET_USD_UNIT,
  SOL_PRICE_UNIT,
  TOKEN_DECIMALS,
  getTokenPriceUnit,
} from "../constants";
import type {
  MarketInfo,
  MarketMeta,
  PositionInfo,
  PositionSide,
  TradeResult,
  OpenPositionParams,
  OpenLimitOrderParams,
  ClosePositionParams,
  TpSlParams,
  UpdateOrderParams,
  CancelOrderParams,
} from "../types";

// ─── PDA derivation helpers ──────────────────────────────────────────

// The default GMTrade Store for the Gmso1uvJnLbawvw7yezdfCDcPydwW2s2iqG3w6MDucLo program
export const DEFAULT_STORE = new PublicKey(
  "CTDLvGGXnoxvqLyTpGzdGLg9pD6JexKxKXSV8tqqo8bN",
);

/**
 * Derive the User account PDA.
 * Seeds: ["user", store, owner]
 */
function findUserPDA(store: PublicKey, owner: PublicKey): PublicKey {
  const encoder = new TextEncoder();
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("user"), store.toBuffer(), owner.toBuffer()],
    GMSOL_STORE_PROGRAM_ID,
  );
  return pda;
}

/**
 * Derive the Position PDA.
 * Seeds: ["position", store, owner, market_token, collateral_token, kind_byte]
 */
function findPositionPDA(
  store: PublicKey,
  owner: PublicKey,
  marketToken: PublicKey,
  collateralToken: PublicKey,
  isLong: boolean,
): PublicKey {
  const encoder = new TextEncoder();
  const kindByte = new Uint8Array([isLong ? 1 : 2]);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      encoder.encode("position"),
      store.toBuffer(),
      owner.toBuffer(),
      marketToken.toBuffer(),
      collateralToken.toBuffer(),
      kindByte,
    ],
    GMSOL_STORE_PROGRAM_ID,
  );
  return pda;
}

/**
 * Derive the Order PDA.
 * Seeds: ["order", store, owner, nonce]
 */
function findOrderPDA(
  store: PublicKey,
  owner: PublicKey,
  nonce: Uint8Array,
): PublicKey {
  const encoder = new TextEncoder();
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("order"), store.toBuffer(), owner.toBuffer(), nonce],
    GMSOL_STORE_PROGRAM_ID,
  );
  return pda;
}

function getCallbackAccounts(): Record<string, PublicKey | null> {
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    GMSOL_STORE_PROGRAM_ID,
  );
  return {
    callbackAuthority: null,
    callbackProgram: null,
    callbackSharedDataAccount: null,
    callbackPartitionedDataAccount: null,
    eventAuthority,
    program: GMSOL_STORE_PROGRAM_ID,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useGmt() {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [lastTradeResult, setLastTradeResult] = useState<TradeResult | null>(
    null,
  );

  // ── Privy Solana wallet ────────────────────────────────────────────

  const privyWallet = useMemo(
    () => wallets.find((w) => isValidSolanaAddress(w.address)) ?? null,
    [wallets],
  );

  // ── Store PDA (default) ────────────────────────────────────────────

  const storePDA = DEFAULT_STORE;

  // Build a signing Program using the user's Privy wallet.
  // Returns `any` because the gmsol_store IDL (106 instructions, 570KB) causes
  // Anchor's generic type system to hit "Type instantiation is excessively deep".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSigningProgram = useCallback((): any => {
    if (!privyWallet) {
      throw new Error("No Solana wallet found. Connect via Privy first.");
    }

    const walletAdapter = createPrivyWalletAdapter(
      privyWallet,
      GMT_CHAIN_PREFIX,
    );

    const provider = new AnchorProvider(
      GMT_CONNECTION,
      walletAdapter as any, // Anchor expects `Wallet` interface
      { ...AnchorProvider.defaultOptions(), commitment: "confirmed" },
    );

    return new Program(IDL, provider);
  }, [privyWallet]);

  // ── List markets (read-only, no wallet needed) ─────────────────────

  const listMarkets = useCallback(async (): Promise<MarketInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all Market accounts from the program
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (GMT_PROGRAM.account as any).market.all();

      return accounts.map((acc: any) => {
        const data = acc.account as any;
        const meta: MarketMeta = {
          marketTokenMint: data.meta?.marketTokenMint?.toBase58() ?? "",
          indexTokenMint: data.meta?.indexTokenMint?.toBase58() ?? "",
          longTokenMint: data.meta?.longTokenMint?.toBase58() ?? "",
          shortTokenMint: data.meta?.shortTokenMint?.toBase58() ?? "",
        };

        // Try to derive name from the data (stored as [u8; 64] byte array)
        let name = "Unknown Market";
        try {
          if (Array.isArray(data.name) || data.name instanceof Uint8Array) {
            // Filter out trailing zero bytes (padding)
            const validBytes = Array.from(data.name as number[]).filter(
              (b) => b !== 0,
            );
            name = new TextDecoder().decode(new Uint8Array(validBytes));
          } else if (typeof data.name === "string") {
            name = data.name;
          }
        } catch (e) {
          console.warn("Failed to decode market name", e);
        }

        return {
          address: acc.publicKey.toBase58(),
          name,
          meta,
        };
      });
    } catch (err: any) {
      const msg = err.message || "Failed to fetch markets";
      setError(msg);
      console.error("listMarkets error:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── List positions for current wallet ──────────────────────────────

  const listPositions = useCallback(async (): Promise<PositionInfo[]> => {
    if (!privyWallet) {
      setError("No wallet connected");
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const ownerPubkey = new PublicKey(privyWallet.address);

      // Fetch Position accounts filtered by owner
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (GMT_PROGRAM.account as any).position.all([
        {
          memcmp: {
            // The owner field offset depends on the account layout
            // This needs to match the discriminator + field offsets in the IDL
            offset: 8 + 1 + 1 + 32, // version(1) + bump(1) + store(32) after discriminator(8)
            bytes: ownerPubkey.toBase58(),
          },
        },
      ]);

      return accounts.map((acc: any) => {
        const data = acc.account as any;
        const side: PositionSide = data.kind === 1 ? "long" : "short";

        return {
          address: acc.publicKey.toBase58(),
          store: data.store?.toBase58() ?? "",
          owner: data.owner?.toBase58() ?? "",
          marketToken: data.marketToken?.toBase58() ?? "",
          side,
          kind: data.kind ?? 0,
          sizeInUsd: data.state?.sizeInUsd?.toString() ?? "0",
          sizeInTokens: data.state?.sizeInTokens?.toString() ?? "0",
          collateralAmount: data.state?.collateralAmount?.toString() ?? "0",
        };
      });
    } catch (err: any) {
      const msg = err.message || "Failed to fetch positions";
      setError(msg);
      console.error("listPositions error:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [privyWallet]);

  // ── Helper: resolve market from name ───────────────────────────────

  const resolveMarket = useCallback(
    async (
      marketName: string,
    ): Promise<{
      marketToken: PublicKey;
      longToken: PublicKey;
      shortToken: PublicKey;
    } | null> => {
      const markets = await listMarkets();
      const found = markets.find(
        (m) => m.name.toLowerCase() === marketName.toLowerCase(),
      );
      if (!found) return null;
      return {
        marketToken: new PublicKey(found.meta.marketTokenMint),
        longToken: new PublicKey(found.meta.longTokenMint),
        shortToken: new PublicKey(found.meta.shortTokenMint),
      };
    },
    [listMarkets],
  );

  // ── Open Market Position (long/short) ──────────────────────────────

  const openPosition = useCallback(
    async (params: OpenPositionParams): Promise<TradeResult> => {
      setIsTrading(true);
      setTradeError(null);
      setLastTradeResult(null);

      try {
        const program = getSigningProgram();
        const owner = new PublicKey(privyWallet!.address);
        const isCollateralLong = params.isCollateralLong ?? true;

        // Resolve market
        const market = await resolveMarket(params.marketName);
        if (!market) {
          throw new Error(`Market "${params.marketName}" not found`);
        }

        const collateralToken = isCollateralLong
          ? market.longToken
          : market.shortToken;
        const sizeDeltaUsd = BigInt(params.sizeUsdWhole) * MARKET_USD_UNIT;

        // Generate random nonce for order PDA
        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);

        // Derive PDAs
        const userPDA = findUserPDA(storePDA, owner);
        const orderPDA = findOrderPDA(storePDA, owner, nonce);
        const positionPDA = findPositionPDA(
          storePDA,
          owner,
          market.marketToken,
          collateralToken,
          params.isLong,
        );

        // Build the CreateOrderParams matching the IDL
        const orderParams = {
          kind: params.isLong ? { marketIncrease: {} } : { marketIncrease: {} }, // MarketIncrease for both long and short — isLong flag controls direction
          decreasePositionSwapType: null,
          executionLamports: new BN(0),
          swapPathLength: 0,
          initialCollateralDeltaAmount: new BN(params.collateralLamports),
          sizeDeltaValue: new BN(sizeDeltaUsd.toString()),
          isLong: params.isLong,
          isCollateralLong: isCollateralLong,
          minOutput: null,
          triggerPrice: null,
          acceptablePrice: null,
          shouldUnwrapNativeToken: true,
          validFromTs: null,
        };

        const preInstructions: TransactionInstruction[] = [];
        if (
          collateralToken.toBase58() === NATIVE_MINT.toBase58() &&
          params.collateralLamports > 0
        ) {
          const wsolAta = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            owner,
            true,
          );
          preInstructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
              owner,
              wsolAta,
              owner,
              NATIVE_MINT,
            ),
          );
          preInstructions.push(
            SystemProgram.transfer({
              fromPubkey: owner,
              toPubkey: wsolAta,
              lamports: params.collateralLamports,
            }),
          );
          preInstructions.push(createSyncNativeInstruction(wsolAta));
        }

        // Call the create_order_v2 instruction
        const tx = await program.methods
          .createOrderV2(Array.from(nonce), orderParams, null)
          .preInstructions(preInstructions)
          .accounts({
            owner,
            receiver: owner,
            store: storePDA,
            market: market.marketToken,
            user: userPDA,
            order: orderPDA,
            position: positionPDA,
            initialCollateralToken: collateralToken,
            finalOutputToken: collateralToken,
            longToken: market.longToken,
            shortToken: market.shortToken,
            initialCollateralTokenSource: getAssociatedTokenAddressSync(
              collateralToken,
              owner,
              true,
            ),
            ...getCallbackAccounts(),
            // Token escrow and ATA accounts will be resolved by Anchor
            // if the IDL has `init_if_needed` or similar constraints
          })
          .rpc();

        const result: TradeResult = {
          success: true,
          txSignature: tx,
          orderAddress: orderPDA.toBase58(),
        };
        setLastTradeResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to open position";
        setTradeError(msg);
        console.error("openPosition error:", err);
        const result: TradeResult = { success: false, error: msg };
        setLastTradeResult(result);
        return result;
      } finally {
        setIsTrading(false);
      }
    },
    [getSigningProgram, privyWallet, storePDA, resolveMarket],
  );

  // ── Close Position ─────────────────────────────────────────────────

  const closePosition = useCallback(
    async (params: ClosePositionParams): Promise<TradeResult> => {
      setIsTrading(true);
      setTradeError(null);
      setLastTradeResult(null);

      try {
        const program = getSigningProgram();
        const owner = new PublicKey(privyWallet!.address);
        const isLong = params.side === "long";
        const isCollateralLong = params.isCollateralLong ?? true;

        const market = await resolveMarket(params.marketName);
        if (!market) {
          throw new Error(`Market "${params.marketName}" not found`);
        }

        const collateralToken = isCollateralLong
          ? market.longToken
          : market.shortToken;

        // 0 = full close (pass max u128)
        const sizeDeltaUsd =
          params.sizeUsdWhole === 0
            ? BigInt("340282366920938463463374607431768211455") // u128::MAX
            : BigInt(params.sizeUsdWhole) * MARKET_USD_UNIT;

        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);

        const userPDA = findUserPDA(storePDA, owner);
        const orderPDA = findOrderPDA(storePDA, owner, nonce);
        const positionPDA = findPositionPDA(
          storePDA,
          owner,
          market.marketToken,
          collateralToken,
          isLong,
        );

        const orderParams = {
          kind: { marketDecrease: {} },
          decreasePositionSwapType: null,
          executionLamports: new BN(0),
          swapPathLength: 0,
          initialCollateralDeltaAmount: new BN(0),
          sizeDeltaValue: new BN(sizeDeltaUsd.toString()),
          isLong,
          isCollateralLong,
          minOutput: null,
          triggerPrice: null,
          acceptablePrice: null,
          shouldUnwrapNativeToken: true,
          validFromTs: null,
        };

        const tx = await program.methods
          .createOrderV2(Array.from(nonce), orderParams, null)
          .accounts({
            owner,
            receiver: owner,
            store: storePDA,
            market: market.marketToken,
            user: userPDA,
            order: orderPDA,
            position: positionPDA,
            initialCollateralToken: collateralToken,
            finalOutputToken: collateralToken,
            longToken: market.longToken,
            shortToken: market.shortToken,
            initialCollateralTokenSource: getAssociatedTokenAddressSync(
              collateralToken,
              owner,
              true,
            ),
            ...getCallbackAccounts(),
          })
          .rpc();

        const result: TradeResult = {
          success: true,
          txSignature: tx,
          orderAddress: orderPDA.toBase58(),
        };
        setLastTradeResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to close position";
        setTradeError(msg);
        console.error("closePosition error:", err);
        const result: TradeResult = { success: false, error: msg };
        setLastTradeResult(result);
        return result;
      } finally {
        setIsTrading(false);
      }
    },
    [getSigningProgram, privyWallet, storePDA, resolveMarket],
  );

  // ── Open Limit Order ───────────────────────────────────────────────

  const openLimitOrder = useCallback(
    async (params: OpenLimitOrderParams): Promise<TradeResult> => {
      setIsTrading(true);
      setTradeError(null);
      setLastTradeResult(null);

      try {
        const program = getSigningProgram();
        const owner = new PublicKey(privyWallet!.address);
        const isCollateralLong = params.isCollateralLong ?? true;

        const market = await resolveMarket(params.marketName);
        if (!market) {
          throw new Error(`Market "${params.marketName}" not found`);
        }

        const collateralToken = isCollateralLong
          ? market.longToken
          : market.shortToken;
        const sizeDeltaUsd = BigInt(params.sizeUsdWhole) * MARKET_USD_UNIT;

        // Derive price precision from base asset
        const baseAsset = params.marketName.split("/")[0] ?? "SOL";
        const decimals = TOKEN_DECIMALS[baseAsset.toUpperCase()] ?? 9;
        const priceUnit = getTokenPriceUnit(decimals);
        const triggerPrice = BigInt(params.triggerPriceUsd) * priceUnit;

        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);

        const userPDA = findUserPDA(storePDA, owner);
        const orderPDA = findOrderPDA(storePDA, owner, nonce);
        const positionPDA = findPositionPDA(
          storePDA,
          owner,
          market.marketToken,
          collateralToken,
          params.isLong,
        );

        const orderParams = {
          kind: { limitIncrease: {} },
          decreasePositionSwapType: null,
          executionLamports: new BN(0),
          swapPathLength: 0,
          initialCollateralDeltaAmount: new BN(params.collateralLamports),
          sizeDeltaValue: new BN(sizeDeltaUsd.toString()),
          isLong: params.isLong,
          isCollateralLong,
          minOutput: null,
          triggerPrice: new BN(triggerPrice.toString()),
          acceptablePrice: null,
          shouldUnwrapNativeToken: true,
          validFromTs: null,
        };

        const preInstructions: TransactionInstruction[] = [];
        if (
          collateralToken.toBase58() === NATIVE_MINT.toBase58() &&
          params.collateralLamports > 0
        ) {
          const wsolAta = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            owner,
            true,
          );
          preInstructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
              owner,
              wsolAta,
              owner,
              NATIVE_MINT,
            ),
          );
          preInstructions.push(
            SystemProgram.transfer({
              fromPubkey: owner,
              toPubkey: wsolAta,
              lamports: params.collateralLamports,
            }),
          );
          preInstructions.push(createSyncNativeInstruction(wsolAta));
        }

        const tx = await program.methods
          .createOrderV2(Array.from(nonce), orderParams, null)
          .preInstructions(preInstructions)
          .accounts({
            owner,
            receiver: owner,
            store: storePDA,
            market: market.marketToken,
            user: userPDA,
            order: orderPDA,
            position: positionPDA,
            initialCollateralToken: collateralToken,
            finalOutputToken: collateralToken,
            longToken: market.longToken,
            shortToken: market.shortToken,
            initialCollateralTokenSource: getAssociatedTokenAddressSync(
              collateralToken,
              owner,
              true,
            ),
            ...getCallbackAccounts(),
          })
          .rpc();

        const result: TradeResult = {
          success: true,
          txSignature: tx,
          orderAddress: orderPDA.toBase58(),
        };
        setLastTradeResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to create limit order";
        setTradeError(msg);
        console.error("openLimitOrder error:", err);
        const result: TradeResult = { success: false, error: msg };
        setLastTradeResult(result);
        return result;
      } finally {
        setIsTrading(false);
      }
    },
    [getSigningProgram, privyWallet, storePDA, resolveMarket],
  );

  // ── Take Profit ────────────────────────────────────────────────────

  const takeProfitOrder = useCallback(
    async (params: TpSlParams): Promise<TradeResult> => {
      setIsTrading(true);
      setTradeError(null);
      setLastTradeResult(null);

      try {
        const program = getSigningProgram();
        const owner = new PublicKey(privyWallet!.address);
        const isLong = params.side === "long";
        const isCollateralLong = params.isCollateralLong ?? true;

        const market = await resolveMarket(params.marketName);
        if (!market) throw new Error(`Market "${params.marketName}" not found`);

        const collateralToken = isCollateralLong
          ? market.longToken
          : market.shortToken;
        const sizeDeltaUsd = BigInt(params.sizeUsdWhole) * MARKET_USD_UNIT;
        const triggerPrice = BigInt(params.priceUsd) * SOL_PRICE_UNIT;

        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);

        const userPDA = findUserPDA(storePDA, owner);
        const orderPDA = findOrderPDA(storePDA, owner, nonce);
        const positionPDA = findPositionPDA(
          storePDA,
          owner,
          market.marketToken,
          collateralToken,
          isLong,
        );

        const orderParams = {
          kind: { limitDecrease: {} },
          decreasePositionSwapType: null,
          executionLamports: new BN(0),
          swapPathLength: 0,
          initialCollateralDeltaAmount: new BN(0),
          sizeDeltaValue: new BN(sizeDeltaUsd.toString()),
          isLong,
          isCollateralLong,
          minOutput: null,
          triggerPrice: new BN(triggerPrice.toString()),
          acceptablePrice: null,
          shouldUnwrapNativeToken: true,
          validFromTs: null,
        };

        const tx = await program.methods
          .createOrderV2(Array.from(nonce), orderParams, null)
          .accounts({
            owner,
            receiver: owner,
            store: storePDA,
            market: market.marketToken,
            user: userPDA,
            order: orderPDA,
            position: positionPDA,
            initialCollateralToken: collateralToken,
            finalOutputToken: collateralToken,
            longToken: market.longToken,
            shortToken: market.shortToken,
            initialCollateralTokenSource: getAssociatedTokenAddressSync(
              collateralToken,
              owner,
              true,
            ),
            ...getCallbackAccounts(),
          })
          .rpc();

        const result: TradeResult = {
          success: true,
          txSignature: tx,
          orderAddress: orderPDA.toBase58(),
        };
        setLastTradeResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to create take-profit order";
        setTradeError(msg);
        const result: TradeResult = { success: false, error: msg };
        setLastTradeResult(result);
        return result;
      } finally {
        setIsTrading(false);
      }
    },
    [getSigningProgram, privyWallet, storePDA, resolveMarket],
  );

  // ── Stop Loss ──────────────────────────────────────────────────────

  const stopLossOrder = useCallback(
    async (params: TpSlParams): Promise<TradeResult> => {
      setIsTrading(true);
      setTradeError(null);
      setLastTradeResult(null);

      try {
        const program = getSigningProgram();
        const owner = new PublicKey(privyWallet!.address);
        const isLong = params.side === "long";
        const isCollateralLong = params.isCollateralLong ?? true;

        const market = await resolveMarket(params.marketName);
        if (!market) throw new Error(`Market "${params.marketName}" not found`);

        const collateralToken = isCollateralLong
          ? market.longToken
          : market.shortToken;
        const sizeDeltaUsd = BigInt(params.sizeUsdWhole) * MARKET_USD_UNIT;
        const triggerPrice = BigInt(params.priceUsd) * SOL_PRICE_UNIT;

        const nonce = new Uint8Array(32);
        crypto.getRandomValues(nonce);

        const userPDA = findUserPDA(storePDA, owner);
        const orderPDA = findOrderPDA(storePDA, owner, nonce);
        const positionPDA = findPositionPDA(
          storePDA,
          owner,
          market.marketToken,
          collateralToken,
          isLong,
        );

        const orderParams = {
          kind: { stopLossDecrease: {} },
          decreasePositionSwapType: null,
          executionLamports: new BN(0),
          swapPathLength: 0,
          initialCollateralDeltaAmount: new BN(0),
          sizeDeltaValue: new BN(sizeDeltaUsd.toString()),
          isLong,
          isCollateralLong,
          minOutput: null,
          triggerPrice: new BN(triggerPrice.toString()),
          acceptablePrice: null,
          shouldUnwrapNativeToken: true,
          validFromTs: null,
        };

        const tx = await program.methods
          .createOrderV2(Array.from(nonce), orderParams, null)
          .accounts({
            owner,
            receiver: owner,
            store: storePDA,
            market: market.marketToken,
            user: userPDA,
            order: orderPDA,
            position: positionPDA,
            initialCollateralToken: collateralToken,
            finalOutputToken: collateralToken,
            longToken: market.longToken,
            shortToken: market.shortToken,
            initialCollateralTokenSource: getAssociatedTokenAddressSync(
              collateralToken,
              owner,
              true,
            ),
            ...getCallbackAccounts(),
          })
          .rpc();

        const result: TradeResult = {
          success: true,
          txSignature: tx,
          orderAddress: orderPDA.toBase58(),
        };
        setLastTradeResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to create stop-loss order";
        setTradeError(msg);
        const result: TradeResult = { success: false, error: msg };
        setLastTradeResult(result);
        return result;
      } finally {
        setIsTrading(false);
      }
    },
    [getSigningProgram, privyWallet, storePDA, resolveMarket],
  );

  // ── Update Order ───────────────────────────────────────────────────

  const updateOrder = useCallback(
    async (params: UpdateOrderParams): Promise<TradeResult> => {
      setIsTrading(true);
      setTradeError(null);
      setLastTradeResult(null);

      try {
        const program = getSigningProgram();
        const owner = new PublicKey(privyWallet!.address);

        const market = await resolveMarket(params.marketName);
        if (!market) throw new Error(`Market "${params.marketName}" not found`);

        const newTriggerPrice = BigInt(params.newPriceUsd) * SOL_PRICE_UNIT;

        const updateParams = {
          sizeDeltaValue: null,
          acceptablePrice: null,
          triggerPrice: new BN(newTriggerPrice.toString()),
          minOutput: null,
          validFromTs: null,
        };

        const tx = await program.methods
          .updateOrder(updateParams)
          .accounts({
            owner,
            store: storePDA,
            market: market.marketToken,
            order: new PublicKey(params.orderAddress),
          })
          .rpc();

        const result: TradeResult = { success: true, txSignature: tx };
        setLastTradeResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to update order";
        setTradeError(msg);
        const result: TradeResult = { success: false, error: msg };
        setLastTradeResult(result);
        return result;
      } finally {
        setIsTrading(false);
      }
    },
    [getSigningProgram, privyWallet, storePDA, resolveMarket],
  );

  // ── Cancel Order ───────────────────────────────────────────────────

  const cancelOrder = useCallback(
    async (params: CancelOrderParams): Promise<TradeResult> => {
      setIsTrading(true);
      setTradeError(null);
      setLastTradeResult(null);

      try {
        const program = getSigningProgram();
        const owner = new PublicKey(privyWallet!.address);

        // close_order requires many accounts — this calls the simplified cancel path
        // The close_order instruction has 26 accounts; for now we use the IDL directly
        const tx = await program.methods
          .closeOrder("User cancelled")
          .accounts({
            executor: owner,
            store: storePDA,
            owner,
            order: new PublicKey(params.orderAddress),
            // Additional accounts need to be resolved based on the specific order
            // This is a simplified version — full implementation needs order-specific data
          })
          .rpc();

        const result: TradeResult = { success: true, txSignature: tx };
        setLastTradeResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to cancel order";
        setTradeError(msg);
        const result: TradeResult = { success: false, error: msg };
        setLastTradeResult(result);
        return result;
      } finally {
        setIsTrading(false);
      }
    },
    [getSigningProgram, privyWallet, storePDA],
  );

  return {
    // State
    privyWallet,
    isLoading,
    error,
    isTrading,
    tradeError,
    lastTradeResult,
    network: GMT_NETWORK,
    storePDA: storePDA.toBase58(),

    // Read-only queries
    listMarkets,
    listPositions,

    // Trading operations
    openPosition,
    closePosition,
    openLimitOrder,
    takeProfitOrder,
    stopLossOrder,
    updateOrder,
    cancelOrder,

    // Utilities
    resolveMarket,
  };
}
