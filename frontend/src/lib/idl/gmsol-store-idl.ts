/**
 * GMsol Store IDL — auto-generated Anchor IDL for the GMTrade store program.
 *
 * The JSON IDL was copied from `gmt/idls/gmsol_store.json`.
 * Anchor v0.30+ uses `address` in the IDL root instead of `metadata.address`.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const idlJson = require("./gmsol_store.json");

export const IDL = idlJson;
export type GmsolStore = typeof idlJson;

/** The on-chain program address from the IDL */
export const GMSOL_STORE_PROGRAM_ADDRESS: string = idlJson.address;
