const BASE_URL = process.env.SOSOVALUE_BASE_URL ?? "https://openapi.sosovalue.com/openapi/v1";
const API_KEY = process.env.SOSOVALUE_API_KEY ?? "";

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "x-soso-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`SoSoValue API error ${res.status}: ${path}`);
    const json = await res.json();
    return json.data ?? json;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Currencies
export const getCurrencies = () => get<CurrencyItem[]>("/currencies");
export const getCurrencySnapshot = (id: string) =>
  get<CurrencySnapshot>(`/currencies/${id}/market-snapshot`);
export const getCurrencyKlines = (id: string, interval: string, limit = 100) =>
  get<Kline[]>(`/currencies/${id}/klines`, { interval, limit });
export const getSectorSpotlight = () => get<SectorData>("/currencies/sector-spotlight");

// ETF — real fields: date, total_net_inflow, total_net_assets, total_value_traded, cum_net_inflow
interface ETFSummaryRaw {
  date?: string;
  total_net_inflow?: number;
  total_net_assets?: number;
  total_value_traded?: number;
  // camelCase variants (in case the API normalises them)
  totalNetFlow?: number;
  totalNetAsset?: number;
}
function n(v: unknown): number { return Number(v) || 0; }

function mapETFSummary(r: ETFSummaryRaw): ETFSummary {
  return {
    date: r.date ?? "",
    totalNetFlow: n(r.total_net_inflow ?? r.totalNetFlow),
    btcFlow: 0,
    ethFlow: 0,
    totalNetAsset: n(r.total_net_assets ?? r.totalNetAsset),
  };
}
export const getETFSummaryHistory = async (days = 30): Promise<ETFSummary[]> => {
  const raw = await get<ETFSummaryRaw[]>("/etfs/summary-history", { limit: days });
  return (Array.isArray(raw) ? raw : []).map(mapETFSummary);
};
export const getETFList = () => get<ETFItem[]>("/etfs");
export const getETFSnapshot = (ticker: string) =>
  get<ETFSnapshot>(`/etfs/${ticker}/market-snapshot`);

// Indices
export const getIndexList = () => get<IndexItem[]>("/indices");
export const getIndexConstituents = (ticker: string) =>
  get<IndexConstituent[]>(`/indices/${ticker}/constituents`);
export const getIndexSnapshot = (ticker: string) =>
  get<IndexSnapshot>(`/indices/${ticker}/market-snapshot`);

// Crypto Stocks — real snapshot fields: ticker, mkt_price, total_marketcap (no change field)
interface StockSnapshotRaw {
  ticker?: string;
  mkt_price?: number;
  total_marketcap?: number;
  circulating_marketcap?: number;
  // camelCase variants
  price?: number;
  change?: number;
  marketCap?: number;
}
function mapStockSnapshot(r: StockSnapshotRaw, ticker: string): StockSnapshot {
  return {
    ticker: r.ticker ?? ticker,
    price: n(r.mkt_price ?? r.price),
    change: n(r.change),
    marketCap: n(r.total_marketcap ?? r.circulating_marketcap ?? r.marketCap),
  };
}
export const getCryptoStocks = () => get<StockItem[]>("/crypto-stocks");
export const getStockSnapshot = async (ticker: string): Promise<StockSnapshot> => {
  const raw = await get<StockSnapshotRaw>(`/crypto-stocks/${ticker}/market-snapshot`);
  return mapStockSnapshot(raw, ticker);
};
export const getStockSectors = () => get<StockSector[]>("/crypto-stocks/sector");

// BTC Treasuries — real fields: ticker, name, list_location; purchase: date, btc_acq, avg_btc_cost, acq_cost
interface BTCTreasuryRaw {
  ticker?: string;
  name?: string;
  list_location?: string;
  country?: string;
}
interface BTCPurchaseRaw {
  date?: string;
  btc_acq?: number;
  avg_btc_cost?: number;
  acq_cost?: number;
  // camelCase variants
  amount?: number;
  price?: number;
  totalValue?: number;
}
function mapBTCTreasury(r: BTCTreasuryRaw): BTCTreasury {
  return {
    ticker: r.ticker ?? "",
    name: r.name ?? "",
    country: r.list_location ?? r.country ?? "US",
    totalBTC: 0,
    totalValue: 0,
  };
}
function mapBTCPurchase(r: BTCPurchaseRaw): BTCPurchase {
  const amount = n(r.btc_acq ?? r.amount);
  const price  = n(r.avg_btc_cost ?? r.price);
  return {
    date: r.date ?? "",
    amount,
    price,
    totalValue: n(r.acq_cost ?? r.totalValue) || amount * price,
  };
}
export const getBTCTreasuries = async (): Promise<BTCTreasury[]> => {
  const raw = await get<BTCTreasuryRaw[]>("/btc-treasuries");
  return (Array.isArray(raw) ? raw : []).map(mapBTCTreasury);
};
export const getBTCPurchaseHistory = async (ticker: string, limit = 20): Promise<BTCPurchase[]> => {
  const raw = await get<BTCPurchaseRaw[]>(`/btc-treasuries/${ticker}/purchase-history`, { limit });
  return (Array.isArray(raw) ? raw : []).map(mapBTCPurchase);
};

// News — real fields: id, title, content (HTML), release_time (ms), category (int), matched_currencies, tags
interface NewsItemRaw {
  id: number | string;
  title: string;
  content: string;
  release_time: number;
  category: number;
  tags?: string[];
  source_link?: string;
  matched_currencies?: Array<{ id: string; full_name: string; name: string }>;
}
interface NewsPaginatedRaw { list: NewsItemRaw[]; page: number; page_size: number; total: number }

const NEWS_CATEGORY_LABELS: Record<number, string> = {
  1: "News", 2: "Research", 3: "Institution", 4: "KOL", 7: "Announcement", 13: "Crypto Stock",
};

function mapNewsItem(raw: NewsItemRaw): NewsItem {
  const plain = raw.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) ?? "";
  const ts = raw.release_time ? new Date(raw.release_time) : null;
  const publishTime = ts && !isNaN(ts.getTime()) ? ts.toISOString() : new Date().toISOString();
  return {
    newsId: String(raw.id),
    title: raw.title ?? "",
    summary: plain,
    publishTime,
    categories: [NEWS_CATEGORY_LABELS[raw.category] ?? "News", ...(raw.tags ?? [])].slice(0, 3),
    currencyCodes: (raw.matched_currencies ?? []).map(c => c.name).slice(0, 5),
  };
}

export const getNewsFeed = async (pageSize = 50): Promise<NewsItem[]> => {
  const data = await get<NewsPaginatedRaw>("/news", { page: 1, page_size: Math.min(pageSize, 100) });
  return (data.list ?? []).map(mapNewsItem);
};
export const getHotNews = async (): Promise<NewsItem[]> => {
  const data = await get<NewsPaginatedRaw>("/news/hot", { page: 1, page_size: 20 });
  return (data.list ?? []).map(mapNewsItem);
};

// Fundraising — list only returns project_id + project_name; sector/amount/date require per-project detail calls.
// The engine uses mock data for L1 since sector-level list queries aren't supported by the API.
export const getFundraisingProjects = (limit = 50) =>
  get<FundraisingProject[]>("/fundraising/projects", { limit });
export const getFundraisingDetail = (id: string) =>
  get<FundraisingProjectDetail>(`/fundraising/projects/${id}`);

// Macro — history: real fields: date, actual, forecast, previous (no btcChange24h in API)
interface MacroEventHistoryRaw {
  date?: string;
  actual?: number;
  forecast?: number;
  previous?: number;
  btcChange24h?: number;
  cryptoMarketChange?: number;
}
function mapMacroHistory(r: MacroEventHistoryRaw): MacroEventHistory {
  return {
    date: r.date ?? "",
    actual: n(r.actual),
    forecast: n(r.forecast),
    btcChange24h: n(r.btcChange24h),
    cryptoMarketChange: n(r.cryptoMarketChange),
  };
}
export const getMacroEvents = (date?: string) =>
  get<MacroEvent[]>("/macro/events", date ? { date } : {});
export const getMacroEventHistory = async (event: string, limit = 20): Promise<MacroEventHistory[]> => {
  const raw = await get<MacroEventHistoryRaw[]>(`/macro/events/${encodeURIComponent(event)}/history`, { limit });
  return (Array.isArray(raw) ? raw : []).map(mapMacroHistory);
};

// Analysis charts
export const getAnalysisCharts = () => get<AnalysisChart[]>("/analyses");
export const getChartData = (name: string) =>
  get<ChartData>(`/analyses/${name}`);

// Type stubs — actual shapes come from the API
export interface CurrencyItem { id: string; name: string; symbol: string; sector: string }
export interface CurrencySnapshot { price: number; change24h: number; volume24h: number; marketCap: number }
export interface Kline { time: number; open: number; high: number; low: number; close: number; volume: number }
export interface SectorData { sectors: Array<{ name: string; change24h: number; marketCap: number; tokens: string[] }> }
export interface ETFSummary { date: string; totalNetFlow: number; btcFlow: number; ethFlow: number; totalNetAsset: number }
export interface ETFItem { ticker: string; name: string; currency: string; totalNetAsset: number }
export interface ETFSnapshot { ticker: string; totalNetFlow: number; totalNetAsset: number; change: number }
export interface IndexItem { ticker: string; name: string; description: string }
export interface IndexConstituent { symbol: string; weight: number; price: number }
export interface IndexSnapshot { ticker: string; value: number; change24h: number }
export interface StockItem { ticker: string; name: string; sector: string; cryptoExposure: string }
export interface StockSnapshot { ticker: string; price: number; change: number; marketCap: number }
export interface StockSector { name: string; indexValue: number; change: number; companies: string[] }
export interface BTCTreasury { ticker: string; name: string; country: string; totalBTC: number; totalValue: number }
export interface BTCPurchase { date: string; amount: number; price: number; totalValue: number }
export interface NewsItem { newsId: string; title: string; summary: string; publishTime: string; categories: string[]; currencyCodes: string[] }
export interface FundraisingProject { id: string; name: string; sector: string; stage: string; amount: number; date: string; investors: string[] }
export interface FundraisingProjectDetail extends FundraisingProject { description: string; website: string }
export interface MacroEvent { event: string; date: string; actual?: number; forecast?: number; previous?: number; impact: "HIGH" | "MEDIUM" | "LOW" }
export interface MacroEventHistory { date: string; actual: number; forecast: number; btcChange24h: number; cryptoMarketChange: number }
export interface AnalysisChart { name: string; title: string; description: string }
export interface ChartData { name: string; data: Array<{ time: string; value: number }> }
