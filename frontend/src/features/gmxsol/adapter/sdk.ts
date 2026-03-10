/**
 * Shared lazy SDK loader for @gmsol-labs/gmsol-sdk (WASM).
 * Must be dynamically imported in Next.js to avoid SSR issues.
 */

let _sdk: typeof import("@gmsol-labs/gmsol-sdk") | null = null;

export async function getSDK() {
  if (_sdk) return _sdk;
  const sdk = await import("@gmsol-labs/gmsol-sdk");
  // Enable readable WASM panic messages (must be called once before any SDK use)
  sdk.solana_program_init();
  _sdk = sdk;
  return _sdk;
}

/**
 * Flatten a SerializedTransactionGroup (number[][][]) into Uint8Array[].
 * Each Uint8Array is a single serialized transaction ready for signing.
 *
 * This follows the same iteration pattern as the SDK demo:
 *   for (const batch of txGroup.serialize()) {
 *     for (const txn of batch) { ... }
 *   }
 */
export function flattenTransactionGroup(
  serialized: number[][][],
): Uint8Array[] {
  const txns: Uint8Array[] = [];
  for (const batch of serialized) {
    for (const txn of batch) {
      txns.push(new Uint8Array(txn));
    }
  }
  return txns;
}

/**
 * Convert a number[] to base64 — matches the demo's toBase64 helper.
 */
export function toBase64(data: number[]): string {
  const uint8 = new Uint8Array(data);
  const binary = String.fromCharCode(...uint8);
  return btoa(binary);
}
