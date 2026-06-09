// SoDEX REST client — testnet: https://testnet-gw.sodex.dev/api/v1/spot
// All market endpoints are public (no auth required)

const BASE_URL = (process.env.SODEX_BASE_URL ?? "https://testnet-gw.sodex.dev/api/v1/spot").replace(/\/$/, "");

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`SoDEX ${res.status}: ${path}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`SoDEX error code ${json.code}: ${json.message ?? path}`);
  return json.data;
}

// ── Market endpoints (public) ────────────────────────────────────────────────

export const getSymbols = (symbol?: string) =>
  get<SpotSymbol[]>("/markets/symbols", symbol ? { symbol } : {});

export const getCoins = (coin?: string) =>
  get<SpotCoin[]>("/markets/coins", coin ? { coin } : {});

export const getTickers = (symbol?: string) =>
  get<SpotTicker[]>("/markets/tickers", symbol ? { symbol } : {});

export const getMiniTickers = (symbol?: string) =>
  get<MiniTicker[]>("/markets/miniTickers", symbol ? { symbol } : {});

export const getBookTickers = (symbol?: string) =>
  get<BookTicker[]>("/markets/bookTickers", symbol ? { symbol } : {});

export const getOrderbook = (symbol: string, limit = 20) =>
  get<OrderBook>(`/markets/${symbol}/orderbook`, { limit });

export const getKlines = (symbol: string, interval: string, limit = 200) =>
  get<RPCKline[]>(`/markets/${symbol}/klines`, { interval, limit });

export const getRecentTrades = (symbol: string, limit = 50) =>
  get<Trade[]>(`/markets/${symbol}/trades`, { limit });

// ── Account endpoints (public read — auth only required for writes) ──────────

export const getBalances = (userAddress: string, accountID?: number) =>
  get<SpotAccountBalances>(`/accounts/${userAddress}/balances`, accountID ? { accountID } : {});

export const getOpenOrders = (userAddress: string, symbol?: string) =>
  get<SpotAccountOpenOrder>(`/accounts/${userAddress}/orders`, symbol ? { symbol } : {});

export const getOrderHistory = (userAddress: string, params?: { symbol?: string; limit?: number }) =>
  get<SpotOrder[]>(`/accounts/${userAddress}/orders/history`, params as Record<string, string | number>);

export const getUserTrades = (userAddress: string, params?: { symbol?: string; limit?: number }) =>
  get<UserTrade[]>(`/accounts/${userAddress}/trades`, params as Record<string, string | number>);

// ── Mock data (fallback when testnet is unreachable) ─────────────────────────
// SoDEX testnet uses virtual token pairs prefixed with "v"

export const mockSymbols: SpotSymbol[] = [
  { symbol: "vBTC_vUSDC", baseCoin: "vBTC", quoteCoin: "vUSDC", status: "TRADING", tickSize: "0.1", stepSize: "0.001", minNotional: "10" },
  { symbol: "vETH_vUSDC", baseCoin: "vETH", quoteCoin: "vUSDC", status: "TRADING", tickSize: "0.01", stepSize: "0.01", minNotional: "10" },
  { symbol: "vSOL_vUSDC", baseCoin: "vSOL", quoteCoin: "vUSDC", status: "TRADING", tickSize: "0.001", stepSize: "0.1", minNotional: "5" },
  { symbol: "vARB_vUSDC", baseCoin: "vARB", quoteCoin: "vUSDC", status: "TRADING", tickSize: "0.0001", stepSize: "1", minNotional: "1" },
  { symbol: "vONDO_vUSDC", baseCoin: "vONDO", quoteCoin: "vUSDC", status: "TRADING", tickSize: "0.001", stepSize: "1", minNotional: "1" },
  { symbol: "vRENDER_vUSDC", baseCoin: "vRENDER", quoteCoin: "vUSDC", status: "TRADING", tickSize: "0.001", stepSize: "1", minNotional: "1" },
];

export const mockTickers: SpotTicker[] = [
  { symbol: "vBTC_vUSDC",    lastPrice: "91200",  priceChange: "2183.5",  priceChangePercent: "2.45",  volume: "18420",   quoteVolume: "1680000000", high: "92100",  low: "89800" },
  { symbol: "vETH_vUSDC",    lastPrice: "3420",   priceChange: "103.1",   priceChangePercent: "3.11",  volume: "260000",  quoteVolume: "889000000",  high: "3480",   low: "3310" },
  { symbol: "vSOL_vUSDC",    lastPrice: "148.5",  priceChange: "6.8",     priceChangePercent: "4.80",  volume: "2100000", quoteVolume: "312000000",  high: "152.0",  low: "141.2" },
  { symbol: "vARB_vUSDC",    lastPrice: "1.24",   priceChange: "0.023",   priceChangePercent: "1.89",  volume: "36000000",quoteVolume: "44640000",   high: "1.29",   low: "1.19" },
  { symbol: "vONDO_vUSDC",   lastPrice: "1.82",   priceChange: "0.060",   priceChangePercent: "3.41",  volume: "15000000",quoteVolume: "27300000",   high: "1.87",   low: "1.74" },
  { symbol: "vRENDER_vUSDC", lastPrice: "8.74",   priceChange: "0.513",   priceChangePercent: "6.24",  volume: "5900000", quoteVolume: "51566000",   high: "9.05",   low: "8.12" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpotSymbol {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
  tickSize: string;
  stepSize: string;
  minNotional: string;
  pricePrecision?: number;
  quantityPrecision?: number;
  lastTradePrice?: string;
}

export interface SpotCoin {
  coin: string;
  fullName: string;
  precision: number;
}

export interface SpotTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  high: string;
  low: string;
}

export interface MiniTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
}

export interface BookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

export interface OrderBook {
  bids: [string, string][];  // [price, qty]
  asks: [string, string][];
  lastUpdateId: number;
}

export interface RPCKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export interface Trade {
  id: number;
  price: string;
  qty: string;
  side: number;   // 1=buy, 2=sell
  time: number;
}

export interface SpotAccountBalances {
  balances: Array<{ coin: string; free: string; locked: string }>;
}

export interface SpotAccountOpenOrder {
  orders: SpotOrder[];
}

export interface SpotOrder {
  orderID: number;
  clOrdID: string;
  symbol: string;
  side: number;
  type: number;
  price: string;
  quantity: string;
  filledQuantity: string;
  status: string;
  createTime: number;
}

export interface UserTrade {
  tradeID: number;
  orderID: number;
  symbol: string;
  side: number;
  price: string;
  quantity: string;
  fee: string;
  feeCoin: string;
  time: number;
}
