type GmxsolSocketMessage = {
  type?: string;
  payload?: unknown;
};

type GmxsolMarketInfo = {
  longFundingFeeRateHour?: string;
  shortFundingFeeRateHour?: string;
  longBorrowingFeeRateHour?: string;
  shortBorrowingFeeRateHour?: string;
  longNetRatePerHour?: string;
  shortNetRatePerHour?: string;
  openInterestForLong?: string;
  openInterestForShort?: string;
  volume24h?: string;
  unitPrice?: string;
};

type GmxsolIndexToken = {
  symbol?: string;
  indexToken?: string;
  LongOpenInterest?: string;
  shortOpenInterest?: string;
  unitPrice?: string;
  volume24h?: string;
  maxLeverage?: number | string;
  marketInfos?: GmxsolMarketInfo[];
};

type GmxsolApiMarket = {
  protocol: "gmxsol";
  symbol: string;
  price: number;
  imageUrl: string;
  fundingRate: number;
  maxleverage: number;
  projections: {
    current: number;
    h4: number;
    h8: number;
    h12: number;
    d1: number;
    d7: number;
    d30: number;
    apr: number;
  };
  timestamp: number;
  metadata: {
    contractIndex: number;
    baseCurrency: string;
    quoteCurrency: string;
    openInterest: string;
    indexPrice: string;
    nextFundingRate: string;
    nextFundingRateTimestamp: string;
    high24h: string;
    low24h: string;
    volume24h: string;
    dataAvailability: {
      apr: boolean;
      d7: boolean;
      volume24h: boolean;
      openInterest: boolean;
    };
    gmxsolRates?: {
      longHourly: number;
      shortHourly: number;
    };
  };
};

const GMXSOL_WS_URL = "wss://api.gmtrade.xyz/ws";
const SOCKET_TIMEOUT_MS = 8_000;
const RECONNECT_DELAY_MS = 2_000;
const DEBUG_GMXSOL = ["1", "true", "yes", "on"].includes(
  (process.env.DEBUG_GMXSOL ?? "").toLowerCase(),
);

const EMPTY_PROJECTIONS = {
  current: 0,
  h4: 0,
  h8: 0,
  h12: 0,
  d1: 0,
  d7: 0,
  d30: 0,
  apr: 0,
};

let cachedMarkets: GmxsolApiMarket[] | null = null;
let cachedAt = 0;
let socket: WebSocket | null = null;
let isConnecting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let initialSnapshotWaiters: Array<(value: void | PromiseLike<void>) => void> =
  [];

function parseNumberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBigInt(value: unknown): bigint | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!/^-?\d+$/.test(normalized)) return null;
  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

function toStringSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Convert an 18-decimal fixed-point string to a JS number (1e18 = 1.0). */
function bigIntToFloat(value: unknown, decimals = 18): number {
  const big = parseBigInt(value);
  if (big === null) return 0;
  // Convert to float: shift by `decimals` places
  const divisor = 10 ** decimals;
  return Number(big) / divisor;
}

/** Convert an 18-decimal fixed-point string to a USD string (no decimals). */
function bigIntToUsdString(value: unknown, decimals = 18): string {
  const big = parseBigInt(value);
  if (big === null) return "";
  const divisor = 10n ** BigInt(decimals);
  const usd = big / divisor;
  return usd.toString();
}

function getImageFromMint(mint?: string): string {
  if (!mint) return "";
  return `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`;
}

function mapIndexTokenToMarket(
  token: GmxsolIndexToken,
  contractIndex: number,
): GmxsolApiMarket | null {
  const baseSymbol = token.symbol?.trim().toUpperCase();
  if (!baseSymbol) return null;

  // --- Pick the marketInfo with the highest total OI (best liquidity) ---
  const mktInfo = (() => {
    const infos = token.marketInfos;
    if (!infos || infos.length === 0) return undefined;
    if (infos.length === 1) return infos[0];
    // Select the entry with the highest combined OI
    let best = infos[0];
    let bestOi = 0n;
    for (const info of infos) {
      const longOi = parseBigInt(info.openInterestForLong) ?? 0n;
      const shortOi = parseBigInt(info.openInterestForShort) ?? 0n;
      const total =
        (longOi < 0n ? -longOi : longOi) + (shortOi < 0n ? -shortOi : shortOi);
      if (total > bestOi) {
        bestOi = total;
        best = info;
      }
    }
    return best;
  })();

  // --- Open Interest: use top-level aggregate (sums all markets) ---
  const longOiStr = token.LongOpenInterest;
  const shortOiStr = token.shortOpenInterest;
  const longOiBig = parseBigInt(longOiStr);
  const shortOiBig = parseBigInt(shortOiStr);

  // Total OI = long + short (both in 18-decimal USD)
  const totalOiBig =
    longOiBig !== null || shortOiBig !== null
      ? (longOiBig !== null ? (longOiBig < 0n ? -longOiBig : longOiBig) : 0n) +
        (shortOiBig !== null
          ? shortOiBig < 0n
            ? -shortOiBig
            : shortOiBig
          : 0n)
      : null;

  // Convert from 18-decimal to USD string
  const openInterestValue =
    totalOiBig !== null ? (totalOiBig / 10n ** 18n).toString() : "";

  // --- Volume 24h: use marketInfos if available, else top-level ---
  const vol24hRaw = mktInfo?.volume24h ?? toStringSafe(token.volume24h);
  const volume24h = bigIntToUsdString(vol24hRaw, 18) || toStringSafe(vol24hRaw);

  // --- Price ---
  const indexPrice = toStringSafe(token.unitPrice) || "0";

  // --- Max Leverage: value is in 18-decimal format (e.g. "20000000000000000000000" = 20000, then ÷ 1000 = 20x) ---
  const maxLevRaw = bigIntToFloat(token.maxLeverage, 18);
  const maxLeverage = maxLevRaw > 0 ? Math.round(maxLevRaw / 1000) : 50;
  const clampedMaxLev =
    maxLeverage > 0 && maxLeverage <= 500 ? maxLeverage : 50;

  // --- Funding/Borrowing rates from marketInfos ---
  // The WS API returns rates already scaled as percentages (i.e. 1e18 = 1%).
  // We divide by 10^20 here to convert them into a standard decimal ratio (i.e. 0.01 = 1%)
  // because the frontend code multiplies by 100 before formatting with a '%' sign.
  const longNetRateHourly = bigIntToFloat(mktInfo?.longNetRatePerHour, 20);
  const shortNetRateHourly = bigIntToFloat(mktInfo?.shortNetRatePerHour, 20);

  // Use long net rate as the "current" funding rate (convention: positive = longs pay)
  const currentRate = longNetRateHourly;
  const hasRateData = mktInfo?.longNetRatePerHour !== undefined;

  const projections = hasRateData
    ? {
        current: currentRate,
        h4: currentRate * 4,
        h8: currentRate * 8,
        h12: currentRate * 12,
        d1: currentRate * 24,
        d7: currentRate * 24 * 7,
        d30: currentRate * 24 * 30,
        apr: currentRate * 24 * 365,
      }
    : { ...EMPTY_PROJECTIONS };

  return {
    protocol: "gmxsol",
    symbol: `${baseSymbol}-PERP`,
    price: 0,
    imageUrl: getImageFromMint(token.indexToken),
    fundingRate: currentRate,
    maxleverage: clampedMaxLev,
    projections,
    timestamp: Date.now(),
    metadata: {
      contractIndex,
      baseCurrency: baseSymbol,
      quoteCurrency: "USD",
      openInterest: openInterestValue,
      indexPrice,
      nextFundingRate: toStringSafe(mktInfo?.longNetRatePerHour),
      nextFundingRateTimestamp: "0",
      high24h: "0",
      low24h: "0",
      volume24h,
      dataAvailability: {
        apr: hasRateData,
        d7: hasRateData,
        volume24h: volume24h !== "",
        openInterest: openInterestValue !== "",
      },
      gmxsolRates: {
        longHourly: longNetRateHourly,
        shortHourly: shortNetRateHourly,
      },
    },
  };
}

async function fetchFromGmxsolSocket(): Promise<GmxsolApiMarket[]> {
  // Kept for backward compatibility of internal service shape.
  return getGmxsolMarkets(true);
}

function notifyInitialSnapshotReady() {
  if (initialSnapshotWaiters.length === 0) return;
  const waiters = [...initialSnapshotWaiters];
  initialSnapshotWaiters = [];
  waiters.forEach((resolve) => resolve());
}

function updateFromIndexTokens(tokens: GmxsolIndexToken[]) {
  if (DEBUG_GMXSOL && tokens.length > 0) {
    console.log(`\n[GMXSol WS] Received ${tokens.length} tokens.`);
    const btc = tokens.find((t) => t.symbol === "BTC");
    if (btc) {
      console.log("[GMXSol WS] Raw BTC Data:", JSON.stringify(btc, null, 2));
    }
  }

  const mapped = tokens
    .map((token, idx) => mapIndexTokenToMarket(token, idx))
    .filter((market): market is GmxsolApiMarket => market !== null);

  cachedMarkets = mapped;
  cachedAt = Date.now();
  notifyInitialSnapshotReady();
}

function subscribeStreams(ws: WebSocket) {
  ws.send(
    JSON.stringify({
      query: "candles",
      payload: { tokenSymbol: "BTC", period: "1m", limit: 3 },
    }),
  );
  ws.send(JSON.stringify({ subscribe: "tickers" }));
  ws.send(JSON.stringify({ subscribe: "indexTokens" }));
  ws.send(JSON.stringify({ subscribe: "swapList" }));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void ensureSocketConnected();
  }, RECONNECT_DELAY_MS);
}

function waitForInitialSnapshot(): Promise<void> {
  if (cachedMarkets && cachedMarkets.length > 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      initialSnapshotWaiters = initialSnapshotWaiters.filter(
        (cb) => cb !== wrappedResolve,
      );
      reject(new Error("GMXSol websocket timed out before receiving markets"));
    }, SOCKET_TIMEOUT_MS);

    const wrappedResolve = () => {
      clearTimeout(timeout);
      resolve();
    };

    initialSnapshotWaiters.push(wrappedResolve);
  });
}

async function ensureSocketConnected(): Promise<void> {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  if (isConnecting) {
    return;
  }

  isConnecting = true;

  try {
    socket = new WebSocket(GMXSOL_WS_URL);

    socket.onopen = () => {
      subscribeStreams(socket as WebSocket);
      isConnecting = false;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as GmxsolSocketMessage;
        if (data.type === "indexTokens" && Array.isArray(data.payload)) {
          updateFromIndexTokens(data.payload as GmxsolIndexToken[]);
        }
      } catch {
        // Ignore malformed frames.
      }
    };

    socket.onerror = () => {
      isConnecting = false;
      scheduleReconnect();
    };

    socket.onclose = () => {
      isConnecting = false;
      socket = null;
      scheduleReconnect();
    };
  } catch {
    isConnecting = false;
    scheduleReconnect();
  }
}

export async function getGmxsolMarkets(
  forceRefresh = false,
): Promise<GmxsolApiMarket[]> {
  await ensureSocketConnected();

  if (cachedMarkets && cachedMarkets.length > 0 && !forceRefresh) {
    return cachedMarkets;
  }

  await waitForInitialSnapshot();
  return cachedMarkets ?? [];
}
