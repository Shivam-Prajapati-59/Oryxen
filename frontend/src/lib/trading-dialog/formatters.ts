// ─── Price Formatting ────────────────────────────────────────────────

export function formatPrice(price: number | null | undefined): string {
  if (!price || isNaN(price)) return "-";
  if (price >= 1000)
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

// ─── Percentage / Funding Rate Formatting ────────────────────────────

export function formatPercentage(
  num: number | undefined,
  suffix: string = ""
): string {
  if (num === undefined || num === null) return "-";
  return `${(num * 100).toFixed(2)}%${suffix}`;
}

export function formatFundingRate(rate: number | undefined): string {
  if (rate === undefined || rate === null) return "-";
  const pct = rate * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(4)}%`;
}

// ─── Big Number Formatting (Volume, OI) ──────────────────────────────

export function formatBigNumber(valStr: string | undefined): string {
  if (!valStr) return "-";
  const val = parseFloat(valStr);
  if (isNaN(val)) return "-";
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}
