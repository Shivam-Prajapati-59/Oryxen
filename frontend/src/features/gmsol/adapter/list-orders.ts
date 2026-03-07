import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { GmsolStore } from "@/lib/idl/gmsol/gmsol_store_type";

/** Action state enum (from the actionHeader struct) */
const ACTION_STATES: Record<number, string> = {
  0: "Pending",
  1: "Completed",
  2: "Cancelled",
  3: "Frozen",
};

/** Order kind enum (from the orderActionParams struct) */
const ORDER_KINDS: Record<number, string> = {
  0: "MarketSwap",
  1: "LimitSwap",
  2: "MarketIncrease",
  3: "LimitIncrease",
  4: "MarketDecrease",
  5: "LimitDecrease",
  6: "StopLossDecrease",
  7: "Liquidation",
};

export interface OrderInfo {
  address: string;
  id: string;
  owner: string;
  store: string;
  marketToken: string;
  kind: string;
  side: "long" | "short";
  actionState: string;
  sizeDeltaValue: string;
  initialCollateralDeltaAmount: string;
  triggerPrice: string;
  acceptablePrice: string;
  collateralToken: string;
  initialCollateralToken: string;
  finalOutputToken: string;
  longToken: string;
  shortToken: string;
  //   eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawAccount: any;
}

/**
 * Fetch all orders for a given owner from the GMSOL store program.
 *
 * The `owner` field of the `actionHeader` is at:
 *   discriminator (8) + actionHeader fields before owner:
 *   version(1) + actionState(1) + bump(1) + flags(1) + callbackKind(1) + callbackVersion(1) + padding0(2) + id(8) + store(32) + market(32) = 80
 *   So owner is at offset 80
 */
export const listOrders = async (
  program: Program<GmsolStore>,
  owner: PublicKey,
): Promise<OrderInfo[]> => {
  try {
    const orders = await program.account.order.all([
      {
        memcmp: {
          offset: 80, // actionHeader.owner offset
          bytes: owner.toBase58(),
        },
      },
    ]);

    return orders.map((o) => {
      const acct = o.account as any;
      const header = acct.header ?? {};
      const params = acct.params ?? {};
      const tokens = acct.tokens ?? {};

      const kindNum = params.kind ?? 0;
      const sideNum = params.side ?? 0;
      const actionStateNum = header.actionState ?? 0;

      return {
        address: o.publicKey.toBase58(),
        id: header.id?.toString() ?? "0",
        owner: header.owner?.toBase58?.() ?? owner.toBase58(),
        store: header.store?.toBase58?.() ?? "",
        marketToken: acct.marketToken?.toBase58?.() ?? "",
        kind: ORDER_KINDS[kindNum] ?? `Unknown(${kindNum})`,
        side: sideNum === 1 ? "short" : "long",
        actionState:
          ACTION_STATES[actionStateNum] ?? `Unknown(${actionStateNum})`,
        sizeDeltaValue: params.sizeDeltaValue?.toString() ?? "0",
        initialCollateralDeltaAmount:
          params.initialCollateralDeltaAmount?.toString() ?? "0",
        triggerPrice: params.triggerPrice?.toString() ?? "0",
        acceptablePrice: params.acceptablePrice?.toString() ?? "0",
        collateralToken: params.collateralToken?.toBase58?.() ?? "",
        initialCollateralToken:
          tokens.initialCollateral?.token?.toBase58?.() ?? "",
        finalOutputToken: tokens.finalOutputToken?.token?.toBase58?.() ?? "",
        longToken: tokens.longToken?.token?.toBase58?.() ?? "",
        shortToken: tokens.shortToken?.token?.toBase58?.() ?? "",
        rawAccount: acct,
      };
    });
  } catch (error) {
    console.error("Failed to list GMSOL orders:", error);
    throw error;
  }
};
