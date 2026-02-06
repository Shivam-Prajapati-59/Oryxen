// lib/pacifica.ts
// Utility functions for Pacifica API signing and message construction
// Based on: https://github.com/pacifica-fi/python-sdk/blob/main/common/utils.py

import bs58 from "bs58";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_PACIFICA_API_URL ||
  "https://test-api.pacifica.fi/api/v1";

export { API_BASE_URL };

// ─── Signature Header ────────────────────────────────────────────────
export interface SignatureHeader {
  timestamp: number;
  expiry_window: number;
  type: string;
}

// ─── Deep sort JSON keys (matches Python SDK's sort_json_keys) ───────
function sortJsonKeys(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  }
  if (typeof value === "object") {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortJsonKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Prepare the message string that must be signed.
 * Mirrors the Python SDK's `prepare_message`:
 *   data = { ...header, "data": payload }
 *   message = json.dumps(sort_json_keys(data), separators=(",", ":"))
 */
export function prepareMessage(
  header: SignatureHeader,
  payload: Record<string, any>,
): string {
  const data: Record<string, any> = {
    ...header,
    data: payload,
  };

  const sorted = sortJsonKeys(data);

  // Compact JSON with no spaces — matches Python's json.dumps(message, separators=(",", ":"))
  return JSON.stringify(sorted);
}

/**
 * Encode raw signature bytes to base58 string.
 */
export function encodeSignature(signatureBytes: Uint8Array): string {
  return bs58.encode(signatureBytes);
}
