import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { GmsolStore } from "@/lib/idl/gmxsol/gmsol_store_type";

export interface PositionInfo {
  address: string;
  owner: string;
  marketToken: string;
  collateralToken: string;
  side: "long" | "short";
  sizeInUsd: string;
  sizeInTokens: string;
  collateralAmount: string;
  borrowingFactor: string;
  createdAt: number;
  /** Raw account data (Uint8Array) for SDK decoding */
  rawData: Uint8Array;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawAccount: any;
}

// ── repr(C) byte offsets for the Position account ───────────────────
// Minimal offsets needed for pre-filtering (kind, owner).
// All actual field extraction is done by SDK Position.decode().
const OFF_KIND = 42;
const OFF_OWNER = 56;
const OFF_MARKET_TOKEN = 88;
const OFF_COLLATERAL_TOKEN = 120;
const OFF_INCREASED_AT = 160;
const OFF_SIZE_IN_TOKENS = 184;
const OFF_COLLATERAL_AMOUNT = 200;
const OFF_SIZE_IN_USD = 216;
const OFF_BORROWING_FACTOR = 232;

/** Read a little-endian u128 from a Uint8Array as a bigint string. */
function readU128(buf: Uint8Array, offset: number): string {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const lo = view.getBigUint64(offset, true);
  const hi = view.getBigUint64(offset + 8, true);
  return ((hi << BigInt(64)) | lo).toString();
}

/** Read a Pubkey (32 bytes) from a Uint8Array as a base58 string. */
function readPubkey(buf: Uint8Array, offset: number): string {
  return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

// Anchor discriminator for Position: first 8 bytes of SHA256("account:Position")
const POSITION_DISCRIMINATOR_B58 = "VZMoMoKgZQb";

/**
 * Fetch all positions for a given owner from the GMSOL store program.
 *
 * Uses raw `getProgramAccounts` with memcmp filters (discriminator + owner),
 * then manually deserializes the repr(C) / bytemuck layout for basic fields.
 * The raw data is also returned so callers can use SDK Position.decode()
 * for full position model computation.
 */
export const listPositions = async (
  program: Program<GmsolStore>,
  owner: PublicKey,
): Promise<PositionInfo[]> => {
  try {
    const connection: Connection = program.provider.connection;
    const programId = program.programId;

    const accounts = await connection.getProgramAccounts(programId, {
      commitment: connection.commitment,
      filters: [
        {
          memcmp: {
            offset: OFF_OWNER,
            bytes: owner.toBase58(),
          },
        },
      ],
    });

    const validAccounts = accounts.filter((a) => {
      if (a.account.data.length < OFF_BORROWING_FACTOR + 16) return false;
      const buf = new Uint8Array(a.account.data);
      const kind = buf[OFF_KIND];
      return kind === 1 || kind === 2;
    });

    const allParsed = validAccounts.map((a) => {
      const buf = new Uint8Array(a.account.data);
      const kind = buf[OFF_KIND];
      const ownerStr = readPubkey(buf, OFF_OWNER);
      const marketToken = readPubkey(buf, OFF_MARKET_TOKEN);
      const collateralToken = readPubkey(buf, OFF_COLLATERAL_TOKEN);

      const sizeInTokens = readU128(buf, OFF_SIZE_IN_TOKENS);
      const collateralAmount = readU128(buf, OFF_COLLATERAL_AMOUNT);
      const sizeInUsd = readU128(buf, OFF_SIZE_IN_USD);
      const borrowingFactor = readU128(buf, OFF_BORROWING_FACTOR);
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const increasedAt = Number(view.getBigInt64(OFF_INCREASED_AT, true));

      const side: "long" | "short" = kind === 2 ? "short" : "long";

      return {
        address: a.pubkey.toBase58(),
        owner: ownerStr,
        marketToken,
        collateralToken,
        side,
        sizeInUsd,
        sizeInTokens,
        collateralAmount,
        borrowingFactor,
        createdAt: increasedAt,
        rawData: buf,
        rawAccount: { kind },
      };
    });

    // Filter out zero-size and dust positions.
    // We will just filter out 0 size to be safe since devnet sizes might scale differently
    const MIN_SIZE_USD = BigInt("1000"); // Extremely low threshold just to block 0

    return allParsed.filter((p) => {
      try {
        return BigInt(p.sizeInUsd) >= MIN_SIZE_USD;
      } catch {
        return false;
      }
    });
  } catch (error) {
    console.error("Failed to list GMSOL positions:", error);
    throw error;
  }
};
