/**
 * Jupiter Perpetuals — feature module barrel export.
 */

// Types
export type {
  Custody,
  CustodyAccount,
  Position,
  PositionAccount,
  BorrowPosition,
  PositionRequest,
  PositionRequestAccount,
  ContractTypes,
  Pool,
  PoolApr,
  OraclePrice,
} from "./types";

// Constants
export {
  CUSTODY_PUBKEY,
  CUSTODY_PUBKEYS,
  CUSTODY_MINTS,
  MINT_TO_SYMBOL,
  JUPITER_PERPETUALS_PROGRAM_ID,
  JUPITER_PERPETUALS_PROGRAM,
  JUPITER_PERPETUALS_EVENT_AUTHORITY_PUBKEY,
  JLP_POOL_ACCOUNT_PUBKEY,
  JLP_MINT_PUBKEY,
  DOVES_PROGRAM_ID,
  DOVES_PROGRAM,
  RPC_CONNECTION,
  TOKEN_DECIMALS,
  getTokenDecimals,
  USDC_DECIMALS,
  BPS_POWER,
  DBPS_POWER,
  RATE_POWER,
  DEBT_POWER,
  BORROW_SIZE_PRECISION,
  JLP_DECIMALS,
} from "./constants";

// Utils
export {
  BNToUSDRepresentation,
  divCeil,
  getDynamicPriceSlippage,
  getJupiterMinimumOut,
} from "./utils";

// Hook
export { useJupiter } from "./hooks/useJupiter";
export type {
  JupiterPerpsConfig,
  CustodyInfo,
  OpenPositionResult,
} from "./hooks/useJupiter";

// Adapters
export {
  constructMarketOpenPositionTrade,
  constructMarketClosePositionTrade,
} from "./adapter/create-market-trade";
export {
  getBorrowFee,
  getBorrowApr,
  getHourlyBorrowRate,
  getCumulativeInterest,
  getCurrentFundingRate,
} from "./adapter/get-borrow-fee-and-funding-rate";
export { getCustodyData } from "./adapter/get-custody-data";
export {
  generatePositionPda,
  generatePositionRequestPda,
} from "./adapter/generate-position-and-position-request-pda";
export { getOpenPositionsForWallet } from "./adapter/get-open-positions";
