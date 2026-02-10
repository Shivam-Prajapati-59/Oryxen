import type {
  IdlAccounts,
  ProgramAccount,
  IdlTypes,
  Idl,
} from "@coral-xyz/anchor";
import { type Perpetuals } from "@/lib/idl/jupiter-perpetuals-idl";

// Cast to Idl to work around Anchor 0.30+ type constraints with legacy IDL format
type PerpetualsIdl = Perpetuals & Idl;

export type BorrowPosition = IdlAccounts<PerpetualsIdl>["borrowPosition"];
export type Position = IdlAccounts<PerpetualsIdl>["position"];
export type PositionAccount = ProgramAccount<Position>;

export type PositionRequest = IdlAccounts<PerpetualsIdl>["positionRequest"];
export type PositionRequestAccount = ProgramAccount<PositionRequest>;

export type Custody = IdlAccounts<PerpetualsIdl>["custody"];
export type CustodyAccount = ProgramAccount<Custody>;

export type ContractTypes = IdlTypes<PerpetualsIdl>;
export type Pool = IdlAccounts<PerpetualsIdl>["pool"];
export type PoolApr = ContractTypes["PoolApr"];
export type OraclePrice = IdlTypes<PerpetualsIdl>["OraclePrice"];
