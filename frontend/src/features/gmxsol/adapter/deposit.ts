/**
 * GMSOL Deposit Adapter — uses @gmsol-labs/gmsol-sdk (WASM) directly.
 *
 * Follows the exact SDK calling patterns from the demo:
 *
 * ```ts
 * const depositGroup = create_deposits([depositParams], {
 *   recent_blockhash, payer,
 *   hints: new Map([[marketToken, { pool_tokens: { long_token, short_token } }]]),
 *   transaction_group: {},
 * });
 * ```
 */

import { getSDK, flattenTransactionGroup } from "./sdk";
import type {
  CreateDepositParamsJs,
  CreateDepositOptions,
  CreateDepositHint,
} from "@gmsol-labs/gmsol-sdk";

/**
 * Build serialized transactions for creating one or more deposits.
 *
 * Directly calls `sdk.create_deposits(params, options)` with the same
 * parameter shapes as the demo.
 */
export async function buildCreateDeposits(
  params: CreateDepositParamsJs[],
  options: CreateDepositOptions,
): Promise<Uint8Array[]> {
  const sdk = await getSDK();
  const txGroup = sdk.create_deposits(params, options);
  return flattenTransactionGroup(txGroup.serialize());
}

export type { CreateDepositParamsJs, CreateDepositOptions, CreateDepositHint };
