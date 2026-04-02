/**
 * GMsol Store IDL — auto-generated Anchor IDL for the GMTrade store program.
 *
 * The JSON IDL was copied from `gmt/idls/gmsol_store.json`.
 * Anchor v0.30+ uses `address` in the IDL root instead of `metadata.address`.
 */

import idlJson from "./gmsol_store.json";
import type { GmsolStore } from "./gmsol_store_type";

// The runtime JSON keeps snake_case names, while Anchor's TS helpers expect the
// generated camelCase IDL shape. The cast is limited to this boundary so the
// rest of the app can use the strongly typed program interface.
export const IDL = idlJson as unknown as GmsolStore;
export type { GmsolStore };

export const GMSOL_STORE_PROGRAM_ID = idlJson.address;
