import { PerpFundingRate } from "@/hooks/useFundingRates";

export type ProtocolFilter = "all" | "drift" | "gmxsol";
export type SortKey =
  | "asset"
  | "price"
  | "funding"
  | "volume24h"
  | "openInterest";
export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  sortKey: SortKey | null;
  sortDirection: SortDirection;
}

export function nextSortState(
  current: SortState,
  clickedKey: SortKey,
): SortState {
  if (current.sortKey !== clickedKey) {
    return { sortKey: clickedKey, sortDirection: "asc" };
  }

  if (current.sortDirection === null) {
    return { sortKey: clickedKey, sortDirection: "asc" };
  }

  if (current.sortDirection === "asc") {
    return { sortKey: clickedKey, sortDirection: "desc" };
  }

  return { sortKey: null, sortDirection: null };
}

export function getSortIndicatorState(
  sortState: SortState,
  key: SortKey,
): "neutral" | "asc" | "desc" {
  if (sortState.sortKey !== key || sortState.sortDirection === null) {
    return "neutral";
  }
  return sortState.sortDirection;
}

export function filterPerps(
  data: PerpFundingRate[] | undefined,
  protocolFilter: ProtocolFilter,
  search: string,
): PerpFundingRate[] {
  if (!data) return [];

  const normalizedSearch = search.trim().toLowerCase();

  // Apply protocol filter first
  const byProtocol =
    protocolFilter === "all"
      ? data
      : data.filter((perp) => perp.protocol.toLowerCase() === protocolFilter);

  if (!normalizedSearch) return byProtocol;

  return byProtocol.filter((perp) => {
    // Strip -PERP suffix so searching "SOL" matches "SOL-PERP"
    const baseSymbol = perp.symbol.replace(/-PERP$/i, "").toLowerCase();
    const fullSymbol = perp.symbol.toLowerCase();
    const protocol = perp.protocol.toLowerCase();

    return (
      baseSymbol.includes(normalizedSearch) ||
      fullSymbol.includes(normalizedSearch) ||
      protocol.includes(normalizedSearch)
    );
  });
}

export function getVisibleSymbols(
  perps: PerpFundingRate[],
  visibleRange: { start: number; end: number },
  buffer = 8,
): string[] {
  const start = Math.max(0, visibleRange.start - buffer);
  const end = Math.min(perps.length, visibleRange.end + buffer);

  return perps
    .slice(start, end)
    .map((perp) => perp.symbol.replace(/-PERP$/i, ""))
    .filter((symbol, index, self) => self.indexOf(symbol) === index);
}

export function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function extractFundingRates(perp: PerpFundingRate): {
  longRate?: number;
  shortRate?: number;
} {
  const protocol = perp.protocol.toLowerCase();

  if (protocol === "gmxsol") {
    const rates = perp.metadata?.gmxsolRates;
    let longRate = toFiniteNumber(rates?.longHourly);
    let shortRate = toFiniteNumber(rates?.shortHourly);

    if (longRate === undefined) {
      longRate =
        toFiniteNumber(perp.fundingRate) ??
        toFiniteNumber(perp.projections?.current);
    }

    if (shortRate === undefined && longRate !== undefined) {
      shortRate = -longRate;
    }

    return { longRate, shortRate };
  }

  if (protocol === "drift") {
    const rates = perp.metadata?.driftRates;
    let longRate = toFiniteNumber(rates?.longHourly ?? undefined);
    let shortRate = toFiniteNumber(rates?.shortHourly ?? undefined);

    if (longRate === undefined) {
      longRate =
        toFiniteNumber(perp.fundingRate) ??
        toFiniteNumber(perp.projections?.current);
    }

    if (shortRate === undefined && longRate !== undefined) {
      shortRate = -longRate;
    }

    return { longRate, shortRate };
  }

  return {};
}

function compareNullableNumbers(
  a: number | undefined,
  b: number | undefined,
  direction: Exclude<SortDirection, null>,
): number {
  const aMissing = a === undefined || Number.isNaN(a);
  const bMissing = b === undefined || Number.isNaN(b);

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  return direction === "asc" ? a - b : b - a;
}

export function sortPerps(
  perps: PerpFundingRate[],
  sortState: SortState,
): PerpFundingRate[] {
  if (!sortState.sortKey || !sortState.sortDirection) {
    return perps;
  }

  const next = [...perps];
  const direction = sortState.sortDirection;

  next.sort((a, b) => {
    if (sortState.sortKey === "asset") {
      const cmp = a.symbol.localeCompare(b.symbol);
      return direction === "asc" ? cmp : -cmp;
    }

    if (sortState.sortKey === "price") {
      const aPrice =
        toFiniteNumber(a.metadata?.indexPrice) ?? toFiniteNumber(a.price);
      const bPrice =
        toFiniteNumber(b.metadata?.indexPrice) ?? toFiniteNumber(b.price);
      return compareNullableNumbers(aPrice, bPrice, direction);
    }

    if (sortState.sortKey === "funding") {
      const aFunding =
        extractFundingRates(a).longRate ?? extractFundingRates(a).shortRate;
      const bFunding =
        extractFundingRates(b).longRate ?? extractFundingRates(b).shortRate;
      return compareNullableNumbers(aFunding, bFunding, direction);
    }

    if (sortState.sortKey === "volume24h") {
      const aVol = toFiniteNumber(a.metadata?.volume24h);
      const bVol = toFiniteNumber(b.metadata?.volume24h);
      return compareNullableNumbers(aVol, bVol, direction);
    }

    const aOi = toFiniteNumber(a.metadata?.openInterest);
    const bOi = toFiniteNumber(b.metadata?.openInterest);
    return compareNullableNumbers(aOi, bOi, direction);
  });

  return next;
}

export function formatPrice(price: number | null | undefined): string {
  if (!price || Number.isNaN(price)) return "-";
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export function formatSignedRate(num: number | undefined): string {
  if (num === undefined || Number.isNaN(num)) return "-";
  const pct = num * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(4)}%`;
}

export function formatBigNumber(valStr: string | undefined): string {
  if (!valStr) return "-";
  const val = Number(valStr);
  if (Number.isNaN(val)) return "-";
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}
