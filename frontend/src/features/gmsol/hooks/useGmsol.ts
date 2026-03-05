import { isValidSolanaAddress, createPrivyWalletAdapter } from "@/lib/solana";
import { useWallets } from "@privy-io/react-auth/solana";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarketInfo, CreateOrderFormData } from "../types";
import { listMarkets } from "../adapter/list-markets";
import { createOrder, CreateOrderInput } from "../adapter/order/create-order";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { IDL } from "@/lib/idl/gmsol/gmsol-store-idl";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";
import { GMSOL_RPC_URL, GMSOL_CHAIN_PREFIX } from "../constants";

export const useGmsol = () => {
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [orderTxId, setOrderTxId] = useState<string | null>(null);

  // ── Privy Solana wallet ────────────────────────────────────────────

  const privyWallet = useMemo(
    () => wallets.find((w) => isValidSolanaAddress(w.address)) ?? null,
    [wallets],
  );

  const connection = useMemo(
    () => new Connection(GMSOL_RPC_URL, "processed"),
    [],
  );

  const program = useMemo(() => {
    const provider = privyWallet
      ? new AnchorProvider(
          connection,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createPrivyWalletAdapter(privyWallet, GMSOL_CHAIN_PREFIX) as any,
          {
            commitment: "processed",
            skipPreflight: true,
          },
        )
      : new AnchorProvider(
          connection,
          {
            publicKey: PublicKey.default,
            signTransaction: async () => {
              throw new Error("Wallet not connected");
            },
            signAllTransactions: async () => {
              throw new Error("Wallet not connected");
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          {
            commitment: "processed",
            skipPreflight: true,
          },
        );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program<GmsolStore>(IDL as any, provider);
  }, [privyWallet, connection]);

  // ── Fetch markets ──────────────────────────────────────────────────

  const fetchMarkets = useCallback(async () => {
    if (!program) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await listMarkets(program);
      setMarkets(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch markets";
      console.error(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // ── Submit order ───────────────────────────────────────────────────

  const submitOrder = useCallback(
    async (formData: CreateOrderFormData) => {
      if (!privyWallet) {
        setError("Please connect a Solana wallet first.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setOrderTxId(null);

      try {
        const owner = new PublicKey(privyWallet.address);

        // Fetch the market to get the store address
        const mkt = await program.account.market.fetch(
          new PublicKey(formData.marketAddress),
        );
        const storeAddress = mkt.store;

        const collateralToken = new PublicKey(formData.collateralToken);
        const collateralAmountBN = new BN(formData.initialCollateralAmount);

        const input: CreateOrderInput = {
          owner,
          store: storeAddress,
          marketAddress: new PublicKey(formData.marketAddress),
          collateralToken,
          isCollateralTokenLong: formData.isCollateralTokenLong,
          initialCollateralAmount: collateralAmountBN,
          isLong: formData.isLong,
          sizeDeltaUsd: new BN(formData.sizeDeltaUsd),
          executionFee: new BN(formData.executionFee),
        };

        // Build the createOrder instructions (escrow ATAs + createOrderV2)
        const orderIxs = await createOrder(program, input);

        // ── Bundle: prepareUser → (user ATAs + wrap SOL + escrow ATAs + order)
        // All in ONE atomic transaction. If any instruction fails
        // the entire TX reverts and the user keeps their SOL.
        const tx = new Transaction();

        // 0) Initialize the user PDA if it doesn't exist yet
        const [userPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), storeAddress.toBuffer(), owner.toBuffer()],
          program.programId,
        );
        const userAccountInfo = await connection.getAccountInfo(userPda);
        const userNeedsInit =
          !userAccountInfo ||
          userAccountInfo.owner.equals(SystemProgram.programId);

        if (userNeedsInit) {
          const prepareUserIx = await program.methods
            .prepareUser()
            .accounts({
              owner,
              store: storeAddress,
              user: userPda,
              systemProgram: SystemProgram.programId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
            .instruction();
          tx.add(prepareUserIx);
        }

        // 1) User ATAs + wrap SOL (if native) + escrow ATAs + createOrderV2
        tx.add(...orderIxs);

        tx.feePayer = owner;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const adapter = createPrivyWalletAdapter(
          privyWallet,
          GMSOL_CHAIN_PREFIX,
        );
        const signed = await adapter.signTransaction(tx);
        const rawTx = signed.serialize();
        const txId = await connection.sendRawTransaction(rawTx, {
          skipPreflight: true,
        });

        setOrderTxId(txId);
        console.log("Order transaction sent:", txId);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create order";
        console.error(err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [privyWallet, program, connection],
  );

  return {
    markets,
    isLoading,
    error,
    orderTxId,
    fetchMarkets,
    submitOrder,
    program,
    privyWallet,
  };
};
