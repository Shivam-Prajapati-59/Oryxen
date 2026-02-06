"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  prepareMessage,
  encodeSignature,
  API_BASE_URL,
  type SignatureHeader,
} from "@/lib/pacifica";
import type { OrderSide } from "@/types/pacifica";

// ─── Types ───────────────────────────────────────────────────────────
interface AgentWalletState {
  publicKey: string;
  secretKey: Uint8Array; // We need the secret key to sign market orders locally
}

interface MarketOrderParams {
  symbol: string;
  amount: string;
  side: OrderSide;
  slippagePercent?: string;
  reduceOnly?: boolean;
}

interface PacificaState {
  agentWallet: AgentWalletState | null;
  isBindingAgent: boolean;
  isPlacingOrder: boolean;
  bindError: string | null;
  orderError: string | null;
  lastOrderResult: any | null;
  lastBindResult: any | null;
}

// ─── Helper: find first Solana wallet ────────────────────────────────
function isValidSolanaAddress(address: string): boolean {
  try {
    // Solana addresses are base58 encoded and 32-44 chars
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  } catch {
    return false;
  }
}

/**
 * usePacifica – React hook for Pacifica perpetual DEX integration.
 *
 * Flow:
 *   1. User connects Solana wallet via Privy
 *   2. Call `bindAgentWallet()` → generates an agent keypair,
 *      user signs the bind payload via Privy's `signMessage`,
 *      sends bind request to Pacifica API
 *   3. Call `placeMarketOrder(params)` → agent keypair signs the
 *      order payload locally with nacl (Ed25519), sends to Pacifica API
 */
export function usePacifica() {
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();

  const [state, setState] = useState<PacificaState>({
    agentWallet: null,
    isBindingAgent: false,
    isPlacingOrder: false,
    bindError: null,
    orderError: null,
    lastOrderResult: null,
    lastBindResult: null,
  });

  // Persist agent keypair across renders without triggering re-renders
  const agentKeypairRef = useRef<Keypair | null>(null);

  // Get the first Solana wallet from Privy
  const solanaWallet = useMemo(() => {
    const w = wallets.find((w) => isValidSolanaAddress(w.address));
    return w || null;
  }, [wallets]);

  // ─── 1. BIND AGENT WALLET ───────────────────────────────────────────
  const bindAgentWallet = useCallback(async () => {
    if (!solanaWallet) {
      setState((s) => ({ ...s, bindError: "No Solana wallet connected" }));
      return;
    }

    setState((s) => ({
      ...s,
      isBindingAgent: true,
      bindError: null,
      lastBindResult: null,
    }));

    try {
      const masterPublicKey = solanaWallet.address;

      // 1. Generate a NEW agent keypair
      const agentKeypair = Keypair.generate();
      const agentPublicKey = agentKeypair.publicKey.toBase58();

      // 2. Build the signature header & payload
      const timestamp = Date.now();
      const header: SignatureHeader = {
        timestamp,
        expiry_window: 5000,
        type: "bind_agent_wallet",
      };

      const payload = {
        agent_wallet: agentPublicKey,
      };

      // 3. Prepare the message string (matches Python SDK format)
      const messageString = prepareMessage(header, payload);
      const messageBytes = new TextEncoder().encode(messageString);

      // 4. Sign with user's wallet via Privy's signMessage
      //    Privy returns { signature: Uint8Array }
      const signResult = await signMessage({
        message: messageBytes,
        wallet: solanaWallet,
      });

      // signResult.signature is a Uint8Array
      const signatureBase58 = encodeSignature(
        new Uint8Array(signResult.signature),
      );

      // 5. Build the full request body
      const requestBody = {
        account: masterPublicKey,
        signature: signatureBase58,
        timestamp: header.timestamp,
        expiry_window: header.expiry_window,
        agent_wallet: agentPublicKey,
      };

      // 6. Send bind request to Pacifica API via our proxy
      const response = await fetch("/api/pacifica/bind-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Bind failed: ${response.status}`);
      }

      // 7. Store the agent keypair for signing future orders
      agentKeypairRef.current = agentKeypair;

      setState((s) => ({
        ...s,
        isBindingAgent: false,
        agentWallet: {
          publicKey: agentPublicKey,
          secretKey: agentKeypair.secretKey,
        },
        lastBindResult: data,
      }));

      console.log("✅ Agent wallet bound:", agentPublicKey);
      return data;
    } catch (err: any) {
      console.error("❌ Bind agent failed:", err);
      setState((s) => ({
        ...s,
        isBindingAgent: false,
        bindError: err.message || "Failed to bind agent wallet",
      }));
    }
  }, [solanaWallet, signMessage]);

  // ─── 2. PLACE MARKET ORDER ──────────────────────────────────────────
  const placeMarketOrder = useCallback(
    async (params: MarketOrderParams) => {
      if (!solanaWallet) {
        setState((s) => ({ ...s, orderError: "No Solana wallet connected" }));
        return;
      }
      if (!state.agentWallet || !agentKeypairRef.current) {
        setState((s) => ({
          ...s,
          orderError: "Agent wallet not bound. Call bindAgentWallet() first.",
        }));
        return;
      }

      setState((s) => ({
        ...s,
        isPlacingOrder: true,
        orderError: null,
        lastOrderResult: null,
      }));

      try {
        const masterPublicKey = solanaWallet.address;
        const agentKeypair = agentKeypairRef.current;
        const agentPublicKey = state.agentWallet.publicKey;

        // 1. Build the signature header
        const timestamp = Date.now();
        const header: SignatureHeader = {
          timestamp,
          expiry_window: 5000,
          type: "create_market_order",
        };

        // 2. Build the signature payload
        const clientOrderId = crypto.randomUUID();
        const signaturePayload: Record<string, any> = {
          symbol: params.symbol,
          reduce_only: params.reduceOnly ?? false,
          amount: params.amount,
          side: params.side,
          slippage_percent: params.slippagePercent ?? "0.5",
          client_order_id: clientOrderId,
        };

        // 3. Prepare message and sign with AGENT KEY (local nacl)
        const messageString = prepareMessage(header, signaturePayload);
        const messageBytes = new TextEncoder().encode(messageString);
        const signatureBytes = nacl.sign.detached(
          messageBytes,
          agentKeypair.secretKey,
        );
        const signatureBase58 = encodeSignature(signatureBytes);

        // 4. Build the request body
        const requestBody = {
          account: masterPublicKey,
          agent_wallet: agentPublicKey, // Agent wallet public key
          signature: signatureBase58,
          timestamp: header.timestamp,
          expiry_window: header.expiry_window,
          ...signaturePayload,
        };

        // 5. Send order via our API proxy route
        const response = await fetch("/api/pacifica/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Order failed: ${response.status}`);
        }

        setState((s) => ({
          ...s,
          isPlacingOrder: false,
          lastOrderResult: data,
        }));

        console.log("✅ Market order placed:", data);
        return data;
      } catch (err: any) {
        console.error("❌ Place order failed:", err);
        setState((s) => ({
          ...s,
          isPlacingOrder: false,
          orderError: err.message || "Failed to place market order",
        }));
      }
    },
    [solanaWallet, state.agentWallet],
  );

  return {
    // State
    solanaWallet,
    agentWallet: state.agentWallet,
    isBindingAgent: state.isBindingAgent,
    isPlacingOrder: state.isPlacingOrder,
    bindError: state.bindError,
    orderError: state.orderError,
    lastOrderResult: state.lastOrderResult,
    lastBindResult: state.lastBindResult,

    // Actions
    bindAgentWallet,
    placeMarketOrder,

    // Computed
    isReady: !!solanaWallet,
    isAgentBound: !!state.agentWallet,
  };
}
