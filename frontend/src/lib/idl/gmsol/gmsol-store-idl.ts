/**
 * GMsol Store IDL — auto-generated Anchor IDL for the GMTrade store program.
 *
 * The JSON IDL was copied from `gmt/idls/gmsol_store.json`.
 * Anchor v0.30+ uses `address` in the IDL root instead of `metadata.address`.
 */

import { Idl } from "@coral-xyz/anchor";
import idlJson from "./gmsol_store.json";

export const IDL = idlJson as Idl;
export type GmsolStore = typeof idlJson;

export const GMSOL_STORE_PROGRAM_ID = idlJson.address;
