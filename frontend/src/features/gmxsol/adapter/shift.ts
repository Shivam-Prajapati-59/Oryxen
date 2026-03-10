/**
 * GMSOL Shift Adapter — uses @gmsol-labs/gmsol-sdk (WASM) directly.
 *
 * Follows the exact SDK calling patterns from the demo:
 *
 * ```ts
 * const shiftGroup = create_shifts([shiftParams], {
 *   recent_blockhash, payer,
 *   transaction_group: {},
 * });
 * ```
 */

import { getSDK, flattenTransactionGroup } from "./sdk";
import type {
  CreateShiftParamsJs,
  CreateShiftOptions,
} from "@gmsol-labs/gmsol-sdk";

/**
 * Build serialized transactions for creating one or more shifts.
 *
 * Directly calls `sdk.create_shifts(params, options)` with the same
 * parameter shapes as the demo.
 */
export async function buildCreateShifts(
  params: CreateShiftParamsJs[],
  options: CreateShiftOptions,
): Promise<Uint8Array[]> {
  const sdk = await getSDK();
  const txGroup = sdk.create_shifts(params, options);
  return flattenTransactionGroup(txGroup.serialize());
}

export type { CreateShiftParamsJs, CreateShiftOptions };
