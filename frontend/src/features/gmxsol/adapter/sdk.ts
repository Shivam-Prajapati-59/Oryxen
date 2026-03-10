/**
 * Shared lazy SDK loader for @gmsol-labs/gmsol-sdk (WASM).
 * Must be dynamically imported in Next.js to avoid SSR issues.
 */

let _sdkPromise: Promise<typeof import("@gmsol-labs/gmsol-sdk")> | null = null;

export function getSDK() {
  if (!_sdkPromise) {
    _sdkPromise = import("@gmsol-labs/gmsol-sdk").then((sdk) => {
      // Enable readable WASM panic messages (must be called once before any SDK use)
      sdk.solana_program_init();
      return sdk;
    }).catch((err) => {
      // Clear the cached promise so future calls can retry
      _sdkPromise = null;
      throw err;
    });
  }
  return _sdkPromise;
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
