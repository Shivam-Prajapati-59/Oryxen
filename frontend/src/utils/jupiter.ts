import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const JUPITER_PRICE_API = "https://api.jup.ag/price/v3";
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";

// Helper function to format `bn` values into the string USD representation
export function BNToUSDRepresentation(
  value: BN,
  exponent: number = 8,
  displayDecimals: number = 2,
): string {
  const quotient = value.divn(Math.pow(10, exponent - displayDecimals));
  const usd = Number(quotient) / Math.pow(10, displayDecimals);

  return usd.toLocaleString("en-US", {
    maximumFractionDigits: displayDecimals,
    minimumFractionDigits: displayDecimals,
    useGrouping: false,
  });
}
export const divCeil = (a: BN, b: BN) => {
  var dm = a.divmod(b);
  // Fast case - exact division
  if (dm.mod.isZero()) return dm.div;
  // Round up
  return dm.div.ltn(0) ? dm.div.isubn(1) : dm.div.iaddn(1);
};
//  Calculates the 'priceSlippage' (Limit Price) for opening/closing positions.
export async function getDynamicPriceSlippage(
  collateralMint: PublicKey,
  side: "long" | "short",
  slippageBps: number = 100, // 1% default (100 BPS)
): Promise<BN> {
  // 1. Fetch Price
  const priceRes = await fetch(
    `${JUPITER_PRICE_API}?ids=${collateralMint.toBase58()}&vsToken=USDC`,
  );

  if (!priceRes.ok) throw new Error("Price API failed");

  const priceData = await priceRes.json();
  const priceInfo = priceData.data?.[collateralMint.toBase58()];

  if (!priceInfo || !priceInfo.price)
    throw new Error("Price data missing for mint");
  const currentPrice = priceInfo.price;

  // 2. Convert to 6 decimals (Jupiter Perps Standard)
  const PRICE_DECIMALS = 6;
  const priceBase = Math.floor(currentPrice * Math.pow(10, PRICE_DECIMALS));

  // 3. Apply Slippage
  const slippageMultiplier =
    side === "long"
      ? (10000 + slippageBps) / 10000
      : (10000 - slippageBps) / 10000;

  const limitPriceVal = Math.floor(priceBase * slippageMultiplier);

  return new BN(limitPriceVal);
}

// Fetches the 'jupiterMinimumOut' (Swap Threshold) if a swap is needed.
export async function getJupiterMinimumOut(
  inputMint: PublicKey,
  collateralMint: PublicKey,
  amountIn: BN,
  slippageBps: number = 50, // 0.5% default for swaps
): Promise<BN | null> {
  // No swap needed if tokens are the same
  if (inputMint.equals(collateralMint)) {
    return null;
  }

  // Fetch Quote
  const quoteUrl = `${JUPITER_QUOTE_API}?inputMint=${inputMint.toBase58()}&outputMint=${collateralMint.toBase58()}&amount=${amountIn.toString()}&slippageBps=${slippageBps}`;

  try {
    const quoteRes = await fetch(quoteUrl);
    if (!quoteRes.ok) {
      throw new Error(`Quote API failed with status ${quoteRes.status}`);
    }
    const quoteData = await quoteRes.json();

    if (!quoteData || !quoteData.otherAmountThreshold) {
      console.warn("Jupiter Quote API returned no threshold", quoteData);
      throw new Error("No swap route found");
    }

    return new BN(quoteData.otherAmountThreshold);
  } catch (err) {
    console.error("Failed to fetch Jupiter swap quote:", err);
    throw err; // Re-throw so the UI knows the trade can't proceed
  }
}
