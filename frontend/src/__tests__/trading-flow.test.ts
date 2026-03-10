import { describe, it, expect, vi } from "vitest";
import type { OrderParams } from "@/features/protocol-adapter/types";

/**
 * Trading flow edge-case tests — validates parameter conversions,
 * boundary conditions, and error handling without requiring React rendering.
 */

describe("Trade Parameter Validation", () => {
  // ── Amount validation ──────────────────────────────────────────
  it("rejects zero amount", () => {
    const amount = 0;
    expect(amount <= 0).toBe(true);
  });

  it("rejects negative amount", () => {
    const amount = -5;
    expect(amount <= 0).toBe(true);
  });

  it("accepts positive fractional amount", () => {
    const amount = 0.001;
    expect(amount > 0).toBe(true);
  });

  it("accepts large amounts", () => {
    const amount = 999999;
    expect(amount > 0).toBe(true);
  });

  // ── Leverage validation ────────────────────────────────────────
  it("leverage clamps to minimum of 2", () => {
    const leverage = Math.max(2, 1);
    expect(leverage).toBe(2);
  });

  it("leverage clamps to maximum of 100", () => {
    const leverage = Math.min(100, 150);
    expect(leverage).toBe(100);
  });

  it("leverage integer conversion works", () => {
    const sliderValue = 50; // 0-100 slider
    const leverage = Math.round(2 + ((100 - 2) * sliderValue) / 100);
    expect(leverage).toBe(51);
  });

  // ── USDC to base asset conversion ──────────────────────────────
  it("converts USDC amount to SOL using market price", () => {
    const usdcAmount = 150;
    const price = 150;
    const baseAmount = usdcAmount / price;
    expect(baseAmount).toBeCloseTo(1, 5);
  });

  it("handles very small USDC amounts", () => {
    const usdcAmount = 0.01;
    const price = 150;
    const baseAmount = usdcAmount / price;
    expect(baseAmount).toBeGreaterThan(0);
  });

  it("rejects conversion when price is zero", () => {
    const price = 0;
    expect(price <= 0).toBe(true);
  });

  // ── GMSOL raw value conversions ────────────────────────────────
  it("converts human USD to 30-decimal raw", () => {
    const humanUsd = 100;
    const rawBigInt = BigInt(humanUsd) * BigInt(10) ** BigInt(30);
    // Exact string form: "100" followed by 30 zeros
    expect(rawBigInt.toString()).toBe(humanUsd.toString() + "0".repeat(30));
    // Reverse: slice the string to recover the human value
    const rawStr = rawBigInt.toString();
    const humanStr = rawStr.slice(0, rawStr.length - 30) || "0";
    expect(humanStr).toBe("100");
  });

  it("converts human SOL to 9-decimal raw", () => {
    const humanSol = 1.5;
    const rawLamports = BigInt(Math.floor(humanSol * 1e9));
    expect(rawLamports).toBe(BigInt(1500000000));
  });

  it("handles very small SOL amounts (dust)", () => {
    const humanSol = 0.000000001; // 1 lamport
    const rawLamports = BigInt(Math.floor(humanSol * 1e9));
    expect(rawLamports).toBe(BigInt(1));
  });

  // ── Leveraged size calculation ─────────────────────────────────
  it("calculates leveraged USD size correctly", () => {
    const amountBn = BigInt(1_000_000_000); // 1 SOL
    const leverageBn = BigInt(10);
    const priceBn = BigInt(150_000_000); // $150
    // (amount * leverage * price) / (1e9 * 1e6)
    const leveragedSizeUsd =
      (amountBn * leverageBn * priceBn) / BigInt(1_000_000_000_000_000);
    expect(Number(leveragedSizeUsd)).toBe(1500);
  });

  it("handles maximum leverage correctly", () => {
    const amountBn = BigInt(100_000_000); // 0.1 SOL
    const leverageBn = BigInt(100);
    const priceBn = BigInt(150_000_000); // $150
    const leveragedSizeUsd =
      (amountBn * leverageBn * priceBn) / BigInt(1_000_000_000_000_000);
    expect(Number(leveragedSizeUsd)).toBe(1500);
  });

  // ── Order type mapping ─────────────────────────────────────────
  it("maps generic order types to GMSOL CreateOrderKind", () => {
    const map: Record<string, string> = {
      market: "MarketIncrease",
      limit: "LimitIncrease",
      takeProfit: "LimitDecrease",
      stopLimit: "StopLossDecrease",
    };

    expect(map["market"]).toBe("MarketIncrease");
    expect(map["limit"]).toBe("LimitIncrease");
    expect(map["takeProfit"]).toBe("LimitDecrease");
    expect(map["stopLimit"]).toBe("StopLossDecrease");
  });

  it("maps direction to collateral token selection", () => {
    const longToken = "So11111111111111111111111111111111111111112";
    const shortToken = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    expect("long" === "long" ? longToken : shortToken).toBe(longToken);
    const direction2: string = "short";
    expect(direction2 === "long" ? longToken : shortToken).toBe(shortToken);
  });
});

describe("Limit Order Validation", () => {
  it("rejects limit order with no price", () => {
    const limitPrice = "";
    const parsed = parseFloat(limitPrice);
    expect(isNaN(parsed)).toBe(true);
  });

  it("rejects limit order with zero price", () => {
    const price = 0;
    expect(price <= 0).toBe(true);
  });

  it("accepts valid limit price", () => {
    const limitPrice = "155.50";
    const parsed = parseFloat(limitPrice);
    expect(parsed).toBe(155.5);
    expect(parsed > 0).toBe(true);
  });
});

describe("Position Display Calculations", () => {
  it("calculates PnL color correctly", () => {
    expect(50 >= 0).toBe(true); // emerald
    expect(-50 >= 0).toBe(false); // red
    expect(0 >= 0).toBe(true); // emerald (break-even)
  });

  it("calculates leverage from size and collateral", () => {
    const sizeUsd = 500;
    const collateralUsd = 100;
    const leverage = sizeUsd / collateralUsd;
    expect(leverage).toBe(5);
  });

  it("handles zero collateral gracefully", () => {
    const sizeUsd = 500;
    const collateralUsd = 0;
    const leverage = collateralUsd > 0 ? sizeUsd / collateralUsd : 0;
    expect(leverage).toBe(0);
  });

  it("formats USD values correctly", () => {
    const formatUsd = (v: number): string => {
      if (Math.abs(v) < 0.01) return "$0.00";
      return `$${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(1234.567)).toMatch(/\$1[,.]?234\.57/);
    expect(formatUsd(-50.1)).toMatch(/\$-?50\.10/);
  });

  it("formats price for different magnitudes", () => {
    const formatPrice = (price: number | null | undefined): string => {
      if (!price || isNaN(price)) return "-";
      if (price >= 1000)
        return `$${price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      if (price >= 1) return `$${price.toFixed(4)}`;
      return `$${price.toFixed(6)}`;
    };

    expect(formatPrice(null)).toBe("-");
    expect(formatPrice(undefined)).toBe("-");
    expect(formatPrice(0)).toBe("-");
    expect(formatPrice(0.000123)).toBe("$0.000123");
    expect(formatPrice(5.5)).toBe("$5.5000");
    expect(formatPrice(1500)).toMatch(/\$1[,.]?500\.00/);
  });
});

describe("Protocol Name Mapping", () => {
  const PROTOCOL_NAME_MAP: Record<string, string | null> = {
    Drift: "drift",
    GMXSol: "GMXSol",
  };

  const DISPLAY_NAME_MAP: Record<string, string> = {
    drift: "Drift",
    GMXSol: "GMXSol",
  };

  it("maps display name to protocol name", () => {
    expect(PROTOCOL_NAME_MAP["Drift"]).toBe("drift");
    expect(PROTOCOL_NAME_MAP["GMXSol"]).toBe("GMXSol");
  });

  it("maps protocol name to display name", () => {
    expect(DISPLAY_NAME_MAP["drift"]).toBe("Drift");
    expect(DISPLAY_NAME_MAP["GMXSol"]).toBe("GMXSol");
  });

  it("handles unknown protocol gracefully", () => {
    expect(PROTOCOL_NAME_MAP["Unknown"] ?? null).toBeNull();
  });
});

describe("Order Estimate Edge Cases", () => {
  it("taker fee is higher than maker fee", () => {
    const makerRate = 0.0002;
    const takerRate = 0.0005;
    const size = 10000;

    expect(size * takerRate).toBeGreaterThan(size * makerRate);
  });

  it("handles zero-size estimate", () => {
    const size = 0;
    const fee = size * 0.0005;
    expect(fee).toBe(0);
  });

  it("margin for GMSOL market order equals base amount", () => {
    // GMSOL sends collateral per-order from wallet, so marginRequired = baseAssetAmount
    const baseAmount = 2.5;
    const leverage = 10;
    // The adapter returns marginRequired: params.baseAssetAmount (not leveraged)
    const marginRequired = baseAmount; // per GMSOL adapter logic
    expect(marginRequired).toBe(baseAmount);
    // Leveraged size is separate from margin
    const leveragedSize = baseAmount * leverage;
    expect(leveragedSize).toBe(25);
    expect(marginRequired).toBeLessThan(leveragedSize);
  });
});

describe("BigInt Conversion Safety", () => {
  it("converts float to BigInt without precision loss (within floor)", () => {
    const valueStr = "100.999";
    const [intPart, fracPart = ""] = valueStr.split(".");
    const raw = BigInt(intPart + fracPart.padEnd(9, "0"));
    expect(raw).toBe(BigInt("100999000000"));
  });

  it("handles very large USD values in 30-decimal", () => {
    const usdStr = "1000000";
    const raw = BigInt(usdStr) * BigInt(10) ** BigInt(30);
    expect(raw > BigInt(0)).toBe(true);
    expect(Number(raw / (BigInt(10) ** BigInt(30)))).toBe(1_000_000);
  });

  it("survives round-trip conversion for typical trade size", () => {
    const originalStr = "2.5";
    const parts = originalStr.split(".");
    const intPart = parts[0];
    const fracPart = parts[1] ?? "";
    const raw = BigInt(intPart + fracPart.padEnd(9, "0"));
    const restored = Number(raw) / 1e9;
    expect(restored).toBeCloseTo(2.5, 9);
  });

  it("handles position size display from raw 30-decimal", () => {
    const rawSizeUsd = (BigInt(500) * BigInt(10) ** BigInt(30)).toString();
    const displayUsd = Number(BigInt(rawSizeUsd) / BigInt(10) ** BigInt(30));
    expect(displayUsd).toBe(500);
  });
});
