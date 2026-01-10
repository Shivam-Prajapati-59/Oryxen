import { NextResponse } from "next/server";

export async function GET() {
  const API_KEY = process.env.COINGECKO_API_KEY;
  const BASE_URL = "https://api.coingecko.com/api/v3";

  // Define the protocols you want to support
  const SUPPORTED_PROTOCOLS = ["Drift Protocol", "Hyperliquid (Futures)"];

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
        { status: 500 }
      );
    }

    const derivData = await derivRes.json();
    const marketData = await marketRes.json();

    // Map symbols to images for fast lookup
    const imageMap = new Map(
      marketData.map((coin: any) => [coin.symbol.toLowerCase(), coin.image])
    );

    const filteredPerps = derivData
      .filter(
        (item: any) =>
          item.contract_type === "perpetual" &&
          SUPPORTED_PROTOCOLS.includes(item.market) // Filter for Drift & Hyperliquid only
      )
      .map((perp: any) => {
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
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
