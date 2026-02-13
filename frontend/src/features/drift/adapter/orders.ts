// Drift — Order placement, cancellation, modification.

import {
  DriftClient,
  BN,
  OrderType,
  MarketType,
  PostOnlyParams,
  getOrderParams,
  type OptionalOrderParams,
  type OrderParams,
} from "@drift-labs/sdk-browser";
import {
  type ExecuteTradeParams,
  type TradeResult,
  toPositionDirection,
  toOrderType,
  getTriggerCondition,
} from "../types";
import { explorerUrl, normaliseDriftError } from "./utils";

// ─── Single order ────────────────────────────────────────────────────

export async function placeSingleOrder(
  client: DriftClient,
  params: Omit<ExecuteTradeParams, "startPrice" | "endPrice" | "orderCount">,
): Promise<TradeResult> {
  const {
    marketIndex,
    orderVariant,
    baseAssetAmount,
    price: uiPrice,
    triggerPrice: uiTriggerPrice,
    direction: uiDirection,
    reduceOnly,
    postOnly,
    subAccountId = 0,
  } = params;

  const direction = toPositionDirection(uiDirection);
  const orderType = toOrderType(orderVariant);
  const baseAmountBN = client.convertToPerpPrecision(baseAssetAmount);

  // Price
  let priceBN: BN | undefined;
  if (orderVariant !== "market") {
    if (uiPrice === undefined)
      throw new Error("Price is required for this order type");
    priceBN = client.convertToPricePrecision(uiPrice);
  }

  // Trigger
  let triggerPriceBN: BN | undefined;
  let triggerCondition;

  if (orderVariant === "takeProfit" || orderVariant === "stopLimit") {
    if (uiTriggerPrice === undefined)
      throw new Error("Trigger price is required");
    triggerPriceBN = client.convertToPricePrecision(uiTriggerPrice);
    triggerCondition = getTriggerCondition(orderVariant, uiDirection);
  }

  const orderParams: OptionalOrderParams = {
    orderType,
    marketType: MarketType.PERP,
    marketIndex,
    direction,
    baseAssetAmount: baseAmountBN,
    reduceOnly: reduceOnly ?? false,
    postOnly: postOnly ? PostOnlyParams.MUST_POST_ONLY : PostOnlyParams.NONE,
    ...(priceBN !== undefined && { price: priceBN }),
    ...(triggerPriceBN !== undefined && {
      triggerPrice: triggerPriceBN,
      triggerCondition,
    }),
  };

  const txSig = await client.placePerpOrder(
    orderParams,
    undefined,
    subAccountId,
  );

  return { txSig, explorerUrl: explorerUrl(txSig) };
}

// ─── Scale orders ────────────────────────────────────────────────────

export async function placeScaleOrders(
  client: DriftClient,
  params: ExecuteTradeParams & {
    startPrice: number;
    endPrice: number;
    orderCount: number;
  },
): Promise<TradeResult> {
  const {
    marketIndex,
    baseAssetAmount,
    startPrice,
    endPrice,
    orderCount,
    direction: uiDirection,
    reduceOnly,
    postOnly,
    subAccountId = 0,
  } = params;

  if (orderCount < 2) throw new Error("Scale orders need orderCount >= 2");

  const direction = toPositionDirection(uiDirection);
  const step = (endPrice - startPrice) / (orderCount - 1);
  const singleSize = baseAssetAmount / orderCount;
  const baseAmountBN = client.convertToPerpPrecision(singleSize);

  const orderParamsList: OrderParams[] = [];

  for (let i = 0; i < orderCount; i++) {
    const priceLevel = startPrice + step * i;
    orderParamsList.push(
      getOrderParams({
        orderType: OrderType.LIMIT,
        marketType: MarketType.PERP,
        marketIndex,
        direction,
        baseAssetAmount: baseAmountBN,
        price: client.convertToPricePrecision(priceLevel),
        reduceOnly: reduceOnly ?? false,
        postOnly: postOnly
          ? PostOnlyParams.MUST_POST_ONLY
          : PostOnlyParams.NONE,
      }),
    );
  }

  const txSig = await client.placeOrders(
    orderParamsList,
    undefined,
    subAccountId,
  );

  return { txSig, explorerUrl: explorerUrl(txSig) };
}

// ─── Cancel / Modify ─────────────────────────────────────────────────

export async function cancelOrder(
  client: DriftClient,
  orderId: number,
): Promise<TradeResult> {
  const txSig = await client.cancelOrder(orderId);
  return { txSig, explorerUrl: explorerUrl(txSig) };
}

export async function cancelAllOrders(
  client: DriftClient,
  marketIndex?: number,
  marketType?: MarketType,
): Promise<TradeResult> {
  const txSig = await client.cancelOrders(marketType, marketIndex);
  return { txSig, explorerUrl: explorerUrl(txSig) };
}

export async function modifyOrder(
  client: DriftClient,
  orderId: number,
  modifications: {
    price?: number;
    baseAssetAmount?: number;
    reduceOnly?: boolean;
  },
): Promise<TradeResult> {
  const orderParams: {
    orderId: number;
    newLimitPrice?: BN;
    newBaseAmount?: BN;
    reduceOnly?: boolean;
  } = { orderId };

  if (modifications.price !== undefined)
    orderParams.newLimitPrice = client.convertToPricePrecision(
      modifications.price,
    );
  if (modifications.baseAssetAmount !== undefined)
    orderParams.newBaseAmount = client.convertToPerpPrecision(
      modifications.baseAssetAmount,
    );
  if (modifications.reduceOnly !== undefined)
    orderParams.reduceOnly = modifications.reduceOnly;

  const txSig = await client.modifyOrder(orderParams);
  return { txSig, explorerUrl: explorerUrl(txSig) };
}

/**
 * Unified order dispatcher — routes to single or scale placement.
 */
export async function placeOrder(
  client: DriftClient,
  params: ExecuteTradeParams,
): Promise<TradeResult> {
  try {
    if (params.orderVariant === "scale") {
      if (!params.startPrice || !params.endPrice || !params.orderCount)
        throw new Error(
          "Scale orders require startPrice, endPrice, and orderCount",
        );
      return await placeScaleOrders(client, params as any);
    }
    return await placeSingleOrder(client, params);
  } catch (err) {
    throw new Error(normaliseDriftError(err));
  }
}
