import { PerpFundingRate } from "@/hooks/useFundingRates";

// ─── Sort Configuration ─────────────────────────────────────────────
export type SortKey = "asset" | "price" | "driftFR" | "gmxsolFR" | "netApr" | "sevenDayApr";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

// ─── Protocol Filter ────────────────────────────────────────────────
export type ProtocolFilter = "all" | "drift" | "gmxsol";

// ─── Column Definition ──────────────────────────────────────────────
export interface ColumnDef {
  key: SortKey;
  label: string;
  align: "left" | "right";
  sortable: boolean;
}

export const COLUMNS: ColumnDef[] = [
  { key: "asset", label: "Asset", align: "left", sortable: true },
  { key: "price", label: "Price", align: "right", sortable: true },
  { key: "driftFR", label: "Drift FR", align: "right", sortable: true },
  { key: "gmxsolFR", label: "GMXSol FR", align: "right", sortable: true },
  { key: "netApr", label: "Net APR", align: "right", sortable: true },
  { key: "sevenDayApr", label: "7D APR", align: "right", sortable: true },
];

// ─── Protocol Tab Definition ────────────────────────────────────────
export interface ProtocolTab {
  key: ProtocolFilter;
  label: string;
  color: string; // gradient/accent color
}

export const PROTOCOL_TABS: ProtocolTab[] = [
  { key: "all", label: "All", color: "from-violet-500 to-cyan-500" },
  { key: "drift", label: "Drift", color: "from-indigo-500 to-blue-500" },
  { key: "gmxsol", label: "GMXSol", color: "from-emerald-500 to-teal-500" },
];

// ─── Augmented Market Row ───────────────────────────────────────────
// Extends PerpFundingRate with a canonical base symbol for grouping
export interface MarketRow extends PerpFundingRate {
  baseSymbol: string;
}
