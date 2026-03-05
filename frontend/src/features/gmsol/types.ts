export interface MarketInfo {
  address: string;
  name: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  isEnabled: boolean;
}

export interface CreateOrderFormData {
  marketAddress: string;
  collateralToken: string;
  isCollateralTokenLong: boolean;
  initialCollateralAmount: string;
  isLong: boolean;
  sizeDeltaUsd: string;
  executionFee: string;
}
