export interface PerpData {
  name: string;
  protocol: string;
  imageUrl: string | null;
  baseAsset: string;
}

const SUPPORTED_PROTOCOLS = [
  "Drift Protocol",
  "Hyperliquid (Futures)",
  "Flash Trade",
];

export async function getAllPerps(): Promise<PerpData[]> {
  const API_KEY = process.env.COINGECKO_API_KEY;
  const BASE_URL = "https://api.coingecko.com/api/v3";

  const headers = {
    accept: "application/json",
    "x-cg-demo-api-key": API_KEY ?? "",
  };

  try {
    const [deriveRes, marketRes] = await Promise.all([
      fetch(`${BASE_URL}/derivatives`, { headers }),
      fetch(`${BASE_URL}/coins/markets?vs_currency=usd&per_page=250`, {
        headers,
      }),
    ]);

    if (!deriveRes.ok || !marketRes.ok) {
      throw new Error("Failed to fetch from CoinGecko API");
    }

    const deriveData = (await deriveRes.json()) as any[];
    const marketData = (await marketRes.json()) as any[];

    // Map symbols → image URLs
    const imageMap = new Map<string, string>(
      marketData.map((coin: any) => [coin.symbol.toLowerCase(), coin.image])
    );

    const filteredPerps = deriveData
      .filter(
        (item: any) =>
          item.contract_type === "perpetual" &&
          SUPPORTED_PROTOCOLS.includes(item.market)
      )
      .map((perp: any) => {
        const baseSymbol = perp.index_id.toLowerCase();

        return {
          name: perp.symbol,
          protocol: perp.market,
          imageUrl: imageMap.get(baseSymbol) || null,
          baseAsset: perp.index_id,
        };
      });

    return filteredPerps;
  } catch (error) {
    console.error("Error fetching perps list:", error);
    throw error;
  }
}
