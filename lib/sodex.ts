const SPOT_ENDPOINT = 'https://api.sodex.com/spot/v1';

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${SPOT_ENDPOINT}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`SoDEX API error: ${res.status} ${path}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function getSymbols(symbol?: string) {
  return get<SpotSymbol[]>('/markets/symbols', symbol ? { symbol } : undefined);
}

export async function getTickers(symbol?: string) {
  return get<SpotTicker[]>('/markets/tickers', symbol ? { symbol } : undefined);
}

export async function getMiniTickers(symbol?: string) {
  return get<MiniTicker[]>('/markets/miniTickers', symbol ? { symbol } : undefined);
}

export async function getBookTickers(symbol?: string) {
  return get<BookTicker[]>('/markets/bookTickers', symbol ? { symbol } : undefined);
}

export async function getOrderBook(symbol: string, limit = 20) {
  return get<OrderBook>(`/markets/${symbol}/orderbook`, { limit });
}

export async function getKlines(symbol: string, interval: string, limit = 100) {
  return get<RPCKline[]>(`/markets/${symbol}/klines`, { interval, limit });
}

export async function getRecentTrades(symbol: string, limit = 50) {
  return get<Trade[]>(`/markets/${symbol}/trades`, { limit });
}

export async function getAccountBalances(userAddress: string) {
  return get<SpotAccountBalances>(`/accounts/${userAddress}/balances`);
}

export async function getOpenOrders(userAddress: string, symbol?: string) {
  return get<SpotAccountOpenOrder>(`/accounts/${userAddress}/orders`, symbol ? { symbol } : undefined);
}

// Types
export interface SpotSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  pricePrecision: number;
  quantityPrecision: number;
  tickSize: string;
  stepSize: string;
  minQuantity: string;
  minNotional: string;
  lastTradePrice: string;
}

export interface SpotTicker {
  symbol: string;
  lastPx: string;
  openPx: string;
  highPx: string;
  lowPx: string;
  volume: string;
  quoteVolume: string;
  change: string;
  changePct: number;
  askPx: string;
  bidPx: string;
  openTime: number;
  closeTime: number;
}

export interface MiniTicker {
  symbol: string;
  price: string;
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
  symbol: string;
  bids: [string, string][];
  asks: [string, string][];
  timestamp: number;
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
  id: string;
  price: string;
  quantity: string;
  side: 'BUY' | 'SELL';
  timestamp: number;
}

export interface SpotAccountBalances {
  balances: { asset: string; available: string; locked: string }[];
}

export interface SpotAccountOpenOrder {
  orders: SpotOrder[];
}

export interface SpotOrder {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: string;
  quantity: string;
  status: string;
  createdAt: number;
}
