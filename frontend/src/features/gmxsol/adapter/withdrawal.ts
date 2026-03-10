/**
 * GMSOL Withdrawal Adapter — uses @gmsol-labs/gmsol-sdk (WASM) directly.
 *
 * Follows the exact SDK calling patterns from the demo:
 *
 * ```ts
 * const withdrawalGroup = create_withdrawals([withdrawalParams], {
 *   recent_blockhash, payer,
 *   hints: new Map([[marketToken, { pool_tokens: { long_token, short_token } }]]),
 *   transaction_group: {},
 * });
 * ```
 */

import { getSDK, flattenTransactionGroup } from "./sdk";
import type {
  CreateWithdrawalParamsJs,
  CreateWithdrawalOptions,
  CreateWithdrawalHint,
} from "@gmsol-labs/gmsol-sdk";

/**
 * Build serialized transactions for creating one or more withdrawals.
 *
 * Directly calls `sdk.create_withdrawals(params, options)` with the same
 * parameter shapes as the demo.
 */
export async function buildCreateWithdrawals(
  params: CreateWithdrawalParamsJs[],
  options: CreateWithdrawalOptions,
): Promise<Uint8Array[]> {
  const sdk = await getSDK();
  const txGroup = sdk.create_withdrawals(params, options);
  return flattenTransactionGroup(txGroup.serialize());
}

export type {
  CreateWithdrawalParamsJs,
  CreateWithdrawalOptions,
  CreateWithdrawalHint,
};
