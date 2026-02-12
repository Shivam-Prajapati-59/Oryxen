/**
 * Jupiter Perpetuals — TypeScript types derived from the on-chain IDL.
 *
 * Consolidated from `types/jupiter.ts` into the Jupiter feature module.
 */

import type { IdlAccounts, ProgramAccount, IdlTypes } from "@coral-xyz/anchor";
import { type Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";

export type BorrowPosition = IdlAccounts<Perpetuals>["borrowPosition"];
export type Position = IdlAccounts<Perpetuals>["position"];
export type PositionAccount = ProgramAccount<Position>;

export type PositionRequest = IdlAccounts<Perpetuals>["positionRequest"];
export type PositionRequestAccount = ProgramAccount<PositionRequest>;

export type Custody = IdlAccounts<Perpetuals>["custody"];
export type CustodyAccount = ProgramAccount<Custody>;

export type ContractTypes = IdlTypes<Perpetuals>;
export type Pool = IdlAccounts<Perpetuals>["pool"];
export type PoolApr = ContractTypes["PoolApr"];
export type OraclePrice = IdlTypes<Perpetuals>["OraclePrice"];
