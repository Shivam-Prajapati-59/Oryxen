import { SortConfig, SortKey, SortDirection, MarketRow } from "./types";

// ─── Toggle Sort ─────────────────────────────────────────────────────

export function toggleSort(
  current: SortConfig | null,
  key: SortKey
): SortConfig {
  if (current?.key === key) {
    // Same key: toggle direction
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  // New key: default ascending
  return { key, direction: "asc" };
}

// ─── Sort Markets ────────────────────────────────────────────────────

function getComparableValue(row: MarketRow, key: SortKey): number | string {
  switch (key) {
    case "asset":
      return row.baseSymbol.toLowerCase();
    case "price":
      return row.price ?? 0;
    case "driftFR":
      return row.protocol === "drift" ? (row.fundingRate ?? 0) : 0;
    case "gmxsolFR":
      return row.protocol === "gmxsol" ? (row.fundingRate ?? 0) : 0;
    case "netApr":
      return row.projections?.apr ?? 0;
    case "sevenDayApr":
      return row.projections?.d7 ?? 0;
    default:
      return 0;
  }
}

export function sortMarkets(
  markets: MarketRow[],
  config: SortConfig | null
): MarketRow[] {
  if (!config) return markets;

  const { key, direction } = config;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...markets].sort((a, b) => {
    const aVal = getComparableValue(a, key);
    const bVal = getComparableValue(b, key);

    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * multiplier;
    }

    return ((aVal as number) - (bVal as number)) * multiplier;
  });
}
