import { MarketRow, ProtocolFilter } from "./types";

// ─── Search Filter ───────────────────────────────────────────────────

export function filterBySearch(
  markets: MarketRow[],
  query: string
): MarketRow[] {
  if (!query.trim()) return markets;
  const q = query.toLowerCase();
  return markets.filter(
    (m) =>
      m.symbol.toLowerCase().includes(q) ||
      m.baseSymbol.toLowerCase().includes(q) ||
      m.protocol.toLowerCase().includes(q)
  );
}

// ─── Protocol Filter ─────────────────────────────────────────────────

export function filterByProtocol(
  markets: MarketRow[],
  protocol: ProtocolFilter
): MarketRow[] {
  if (protocol === "all") return markets;
  return markets.filter((m) => m.protocol === protocol);
}

// ─── Combined Filter ─────────────────────────────────────────────────

export function applyFilters(
  markets: MarketRow[],
  search: string,
  protocol: ProtocolFilter
): MarketRow[] {
  let result = markets;
  result = filterByProtocol(result, protocol);
  result = filterBySearch(result, search);
  return result;
}
