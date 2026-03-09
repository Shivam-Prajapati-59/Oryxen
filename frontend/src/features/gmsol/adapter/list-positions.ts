import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawAccount: any;
}

// ── repr(C) byte offsets for the Position account ───────────────────
// The on-chain Position struct uses bytemuck (repr(C)) serialization.
// On Solana SBF, u128 has 8-byte alignment (not 16), so the layout is
// identical to Borsh encoding for this struct. We still parse raw bytes
// to avoid depending on Anchor's coder and to get the kind mapping right.
//
// Layout (with 8-byte Anchor discriminator):
//   0..8   discriminator
//   8      version    (u8)
//   9      bump       (u8)
//  10..42  store      (pubkey)
//  42      kind       (u8)   — 1 = Long, 2 = Short
//  43..56  padding_0  ([u8; 13])
//  56..88  owner      (pubkey)
//  88..120 market_token (pubkey)
// 120..152 collateral_token (pubkey)
//
// PositionState starts at 152:
// 152..160 trade_id       (u64)
// 160..168 increased_at   (i64)
// 168..176 updated_at_slot(u64)
// 176..184 decreased_at   (i64)
// 184..200 size_in_tokens       (u128)
// 200..216 collateral_amount    (u128)
// 216..232 size_in_usd          (u128)
// 232..248 borrowing_factor     (u128)
const OFF_KIND = 42;
const OFF_OWNER = 56;
const OFF_MARKET_TOKEN = 88;
const OFF_COLLATERAL_TOKEN = 120;
const OFF_INCREASED_AT = 160;
const OFF_SIZE_IN_TOKENS = 184;
const OFF_COLLATERAL_AMOUNT = 200;
const OFF_SIZE_IN_USD = 216;
const OFF_BORROWING_FACTOR = 232;

/** Read a little-endian u128 from a Buffer as a bigint string. */
function readU128(buf: Buffer, offset: number): string {
  // Read as two u64 LE halves: low 8 bytes + high 8 bytes
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigUInt64LE(offset + 8);
  return ((hi << BigInt(64)) | lo).toString();
}

/** Read a Pubkey (32 bytes) from a Buffer as a base58 string. */
function readPubkey(buf: Buffer, offset: number): string {
  return new PublicKey(buf.subarray(offset, offset + 32)).toBase58();
}

// Anchor discriminator for Position: first 8 bytes of SHA256("account:Position")
// base58: "VZMoMoKgZQb"
const POSITION_DISCRIMINATOR_B58 = "VZMoMoKgZQb";

/**
 * Fetch all positions for a given owner from the GMSOL store program.
 *
 * Uses raw `getProgramAccounts` with memcmp filters (discriminator + owner),
 * then manually deserializes the repr(C) / bytemuck layout to correctly
 * map PositionKind (1=Long, 2=Short) and read all fields at known offsets.
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
            offset: 0,
            bytes: POSITION_DISCRIMINATOR_B58,
          },
        },
        {
          memcmp: {
            offset: OFF_OWNER,
            bytes: owner.toBase58(),
          },
        },
      ],
    });

    return accounts
      .filter((a) => {
        // Basic size guard — Position accounts should be large enough
        return a.account.data.length >= OFF_BORROWING_FACTOR + 16;
      })
      .map((a) => {
        const buf = a.account.data as Buffer;
        const kind = buf[OFF_KIND];
        const ownerStr = readPubkey(buf, OFF_OWNER);
        const marketToken = readPubkey(buf, OFF_MARKET_TOKEN);
        const collateralToken = readPubkey(buf, OFF_COLLATERAL_TOKEN);

        const sizeInTokens = readU128(buf, OFF_SIZE_IN_TOKENS);
        const collateralAmount = readU128(buf, OFF_COLLATERAL_AMOUNT);
        const sizeInUsd = readU128(buf, OFF_SIZE_IN_USD);
        const borrowingFactor = readU128(buf, OFF_BORROWING_FACTOR);
        const increasedAt = Number(buf.readBigInt64LE(OFF_INCREASED_AT));

        // PositionKind: 1 = Long, 2 = Short (from on-chain enum)
        const side: "long" | "short" = kind === 2 ? "short" : "long";

        console.log("[listPositions] raw position:", {
          address: a.pubkey.toBase58(),
          kind,
          side,
          owner: ownerStr,
          marketToken,
          collateralToken,
          sizeInUsd,
        });

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
          rawAccount: { kind },
        };
      });
  } catch (error) {
    console.error("Failed to list GMSOL positions:", error);
    throw error;
  }
};
