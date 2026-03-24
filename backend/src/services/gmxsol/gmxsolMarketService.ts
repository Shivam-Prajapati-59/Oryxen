type GmxsolSocketMessage = {
  type?: string;
  payload?: unknown;
};

type GmxsolIndexToken = {
  symbol?: string;
  indexToken?: string;
  LongOpenInterest?: string;
  shortOpenInterest?: string;
  unitPrice?: string;
  volume24h?: string;
  maxLeverage?: number | string;
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
  };
};

const GMXSOL_WS_URL = "wss://api.gmtrade.xyz/ws";
const SOCKET_TIMEOUT_MS = 8_000;
const RECONNECT_DELAY_MS = 2_000;

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

  const longOiBig = parseBigInt(token.LongOpenInterest);
  const shortOiBig = parseBigInt(token.shortOpenInterest);

  const openInterestBig =
    longOiBig !== null || shortOiBig !== null
      ? (() => {
          const left =
            longOiBig !== null ? (longOiBig < 0n ? -longOiBig : longOiBig) : 0n;
          const right =
            shortOiBig !== null
              ? shortOiBig < 0n
                ? -shortOiBig
                : shortOiBig
              : 0n;
          return left > right ? left : right;
        })()
      : null;

  const openInterestValue =
    openInterestBig !== null
      ? openInterestBig.toString()
      : (() => {
          const longOi = parseNumberOrZero(token.LongOpenInterest);
          const shortOi = parseNumberOrZero(token.shortOpenInterest);
          const fallback = Math.max(Math.abs(longOi), Math.abs(shortOi));
          return fallback > 0 ? String(fallback) : "";
        })();

  const indexPrice = toStringSafe(token.unitPrice) || "0";
  const volume24h = toStringSafe(token.volume24h);
  const maxLeverageRaw = parseNumberOrZero(token.maxLeverage);
  const maxLeverage =
    maxLeverageRaw > 0 && maxLeverageRaw <= 500 ? maxLeverageRaw : 50;

  return {
    protocol: "gmxsol",
    symbol: `${baseSymbol}-PERP`,
    price: 0,
    imageUrl: getImageFromMint(token.indexToken),
    fundingRate: 0,
    maxleverage: maxLeverage,
    projections: { ...EMPTY_PROJECTIONS },
    timestamp: Date.now(),
    metadata: {
      contractIndex,
      baseCurrency: baseSymbol,
      quoteCurrency: "USD",
      openInterest: openInterestValue,
      indexPrice,
      nextFundingRate: "",
      nextFundingRateTimestamp: "0",
      high24h: "0",
      low24h: "0",
      volume24h,
      dataAvailability: {
        apr: false,
        d7: false,
        volume24h: volume24h !== "",
        openInterest: openInterestValue !== "",
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
