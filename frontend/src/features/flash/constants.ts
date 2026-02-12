/**
 * Flash Trade — Environment constants.
 */

import { SOLANA_DEVNET_RPC, SOLANA_MAINNET_RPC } from "@/config/env";
import type { FlashCluster, FlashPoolName, FlashConfig } from "./types";

const FLASH_ENV: FlashCluster = "devnet"; // Change to "mainnet-beta" for production

const FLASH_RPC_URLS: Record<FlashCluster, string> = {
  devnet: SOLANA_DEVNET_RPC,
  "mainnet-beta": SOLANA_MAINNET_RPC,
};

const FLASH_POOL_NAMES: Record<FlashCluster, FlashPoolName> = {
  devnet: "devnet.1",
  "mainnet-beta": "Crypto.1",
};

const FLASH_CHAIN_PREFIX: Record<FlashCluster, string> = {
  devnet: "solana:devnet",
  "mainnet-beta": "solana:mainnet",
};

/** Resolved configuration for the current environment */
export const FLASH_CONFIG: FlashConfig = {
  cluster: FLASH_ENV,
  poolName: FLASH_POOL_NAMES[FLASH_ENV],
  rpcUrl: FLASH_RPC_URLS[FLASH_ENV],
  chainPrefix: FLASH_CHAIN_PREFIX[FLASH_ENV],
  prioritizationFee: 0,
};

export { FLASH_ENV };
