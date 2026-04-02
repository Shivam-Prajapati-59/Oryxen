import { NextResponse } from "next/server";

interface CoinGeckoDerivative {
  contract_type?: string;
  market?: string;
  symbol?: string;
  index_id?: string;
}

interface CoinGeckoMarket {
  symbol: string;
  image: string | null;
}

type SupportedPerp = CoinGeckoDerivative & {
  market: string;
  symbol: string;
  index_id: string;
};

const SUPPORTED_PROTOCOLS: readonly string[] = [
  "Drift Protocol",
  "Hyperliquid (Futures)",
];

function isSupportedPerp(item: CoinGeckoDerivative): item is SupportedPerp {
  return (
    item.contract_type === "perpetual" &&
    typeof item.market === "string" &&
    SUPPORTED_PROTOCOLS.includes(item.market) &&
    typeof item.symbol === "string" &&
    typeof item.index_id === "string"
  );
}

export async function GET() {
  const API_KEY = process.env.COINGECKO_API_KEY;
  const BASE_URL = "https://api.coingecko.com/api/v3";

  const headers = {
    accept: "application/json",
    "x-cg-demo-api-key": API_KEY || "",
  };

  try {
    const [derivRes, marketRes] = await Promise.all([
      fetch(`${BASE_URL}/derivatives`, { headers, cache: "no-store" }),
      fetch(`${BASE_URL}/coins/markets?vs_currency=usd&per_page=250`, {
        headers,
        next: { revalidate: 3600 },
      }),
    ]);

    if (!derivRes.ok || !marketRes.ok) {
      return NextResponse.json(
        { error: "CoinGecko Fetch Failed" },
        { status: 500 },
      );
    }

    const derivData = (await derivRes.json()) as CoinGeckoDerivative[];
    const marketData = (await marketRes.json()) as CoinGeckoMarket[];

    // Map symbols to images for fast lookup
    const imageMap = new Map(
      marketData.map((coin) => [coin.symbol.toLowerCase(), coin.image]),
    );

    const filteredPerps = derivData
      .filter(isSupportedPerp)
      .map((perp) => {
        const baseSymbol = perp.index_id.toLowerCase();

        return {
          name: perp.symbol, // e.g., "BTC-PERP" or "SOLUSDT"
          protocol: perp.market, // "Drift Protocol" or "Hyperliquid"
          imageUrl: imageMap.get(baseSymbol) || null,
          // We include index_id so your SDK knows which asset to subscribe to
          baseAsset: perp.index_id,
        };
      });

    return NextResponse.json(filteredPerps);
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
