/**
 * GMSOL Market Graph, Simulator & Decoding — uses @gmsol-labs/gmsol-sdk (WASM) directly.
 *
 * Provides all the decoding, model, and simulation functions from the SDK demo:
 *
 * - Market.decode_from_base64 + market.to_model() + model.market_token_price() + model.status()
 * - Position.decode_from_base64 + position.to_model() + position model methods
 * - MarketGraph + graph.insert_market_from_base64() + graph.to_simulator()
 * - Simulator: simulate_order, simulate_deposit, simulate_withdrawal
 * - TradeEvent.decode_from_base64_with_options + tradeEvent.to_position_model()
 * - apply_factor, default_store_program, Pubkey
 */

import { getSDK } from "./sdk";
import type {
  SimulateOrderArgs,
  SimulateDepositArgs,
  SimulateWithdrawalArgs,
  SimulateShiftArgs,
  Value,
} from "@gmsol-labs/gmsol-sdk";

// ─── Market ──────────────────────────────────────────────────────────

/**
 * Decode a Market from base64-encoded account data.
 * Matches: `Market.decode_from_base64(encodedMarket)`
 */
export async function decodeMarket(encodedMarket: string) {
  const sdk = await getSDK();
  return sdk.Market.decode_from_base64(encodedMarket);
}

// ─── Position ────────────────────────────────────────────────────────

/**
 * Decode a Position from base64-encoded account data.
 * Matches: `Position.decode_from_base64(encodedPosition)`
 */
export async function decodePosition(encodedPosition: string) {
  const sdk = await getSDK();
  return sdk.Position.decode_from_base64(encodedPosition);
}

// ─── TradeEvent ──────────────────────────────────────────────────────

/**
 * Decode a TradeEvent from base64-encoded event data.
 * Matches: `TradeEvent.decode_from_base64_with_options(encodedTradeEvent)`
 */
export async function decodeTradeEvent(
  encodedTradeEvent: string,
  noDiscriminator?: boolean,
) {
  const sdk = await getSDK();
  return sdk.TradeEvent.decode_from_base64_with_options(
    encodedTradeEvent,
    noDiscriminator ?? null,
  );
}

// ─── MarketGraph ─────────────────────────────────────────────────────

export interface MarketGraphConfig {
  swap_estimation_params: {
    value: bigint;
    base_cost: bigint;
  };
  max_steps: number;
}

/**
 * Create a new MarketGraph instance.
 *
 * Matches the demo:
 * ```ts
 * const graph = new MarketGraph({
 *   swap_estimation_params: {
 *     value: 1_000_000_000_000_000_000_000n,
 *     base_cost: 1_000_000_000_000_000_000n,
 *   },
 *   max_steps: 5,
 * });
 * graph.insert_market_from_base64(encodedMarket, supply);
 * ```
 */
export async function createMarketGraph(config: MarketGraphConfig) {
  const sdk = await getSDK();
  return new sdk.MarketGraph(config);
}

// ─── Simulator ───────────────────────────────────────────────────────

/**
 * Create a Simulator from a MarketGraph.
 *
 * Matches: `const simulator = graph.to_simulator();`
 *
 * After creating, you can call:
 * - simulator.simulate_order(args, position)
 * - simulator.simulate_deposit(args)
 * - simulator.simulate_withdrawal(args)
 */
export async function createSimulator(
  encodedMarkets: { data: string; supply: bigint }[],
) {
  const sdk = await getSDK();

  const graph = new sdk.MarketGraph({
    swap_estimation_params: {
      value: BigInt(1_000_000_000_000_000_000_000),
      base_cost: BigInt(1_000_000_000_000_000_000),
    },
    max_steps: 5,
  });

  for (const market of encodedMarkets) {
    graph.insert_market_from_base64(market.data, market.supply);
  }

  return { graph, simulator: graph.to_simulator() };
}

// ─── Utility Functions ───────────────────────────────────────────────

/**
 * Apply a factor (multiply and divide by precision).
 * Matches: `apply_factor(value, factor)`
 */
export async function applyFactor(value: bigint, factor: bigint) {
  const sdk = await getSDK();
  return sdk.apply_factor(value, factor);
}

/**
 * Get the default store program address and store.
 * Matches: `default_store_program()`
 */
export async function getDefaultStoreProgram() {
  const sdk = await getSDK();
  return sdk.default_store_program();
}

/**
 * Create a Pubkey instance from a string.
 * Matches: `new Pubkey(token)`
 */
export async function createPubkey(address: string) {
  const sdk = await getSDK();
  return new sdk.Pubkey(address);
}

// ─── Re-exports ─────────────────────────────────────────────────────

export type {
  SimulateOrderArgs,
  SimulateDepositArgs,
  SimulateWithdrawalArgs,
  SimulateShiftArgs,
  Value,
};
