// Drift feature module barrel export
export * from "./types";
export { useDrift } from "./hooks/useDrift";
export { useDriftAdapter } from "./hooks/useDriftAdapter";
export { DriftAdapter } from "./DriftAdapter";
export { DriftProvider, useDriftContext } from "./DriftContext";

// Adapter re-exports for direct use
export { explorerUrl, bnToUsd, bnToBase, bnToPrice } from "./adapter/utils";
export { getOraclePrice, getPerpMarketInfo } from "./adapter/market-data";
export { resolveSpotIndex } from "./adapter/collateral";
export { cancelOrder, cancelAllOrders, modifyOrder } from "./adapter/orders";
