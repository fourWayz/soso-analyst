const BASE_URL = 'https://openapi.sosovalue.com/openapi/v1';

const headers = () => ({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  ...(process.env.SOSOVALUE_API_KEY ? { 'x-soso-api-key': process.env.SOSOVALUE_API_KEY } : {}),
});

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { headers: headers(), next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`SoSoValue API error: ${res.status} ${path}`);
  const json = await res.json();
  return json.data ?? json;
}

export async function getNews(params?: { category?: string; page?: number; size?: number }) {
  return get<{ list: NewsItem[]; total: number }>('/news', params as Record<string, string | number>);
}

export async function getHotNews() {
  return get<NewsItem[]>('/news/hot');
}

export async function getFeaturedNews() {
  return get<NewsItem[]>('/news/featured');
}

export async function getETFSummaryHistory(params?: { startTime?: number; endTime?: number }) {
  return get<ETFSummary[]>('/etfs/summary-history', params as Record<string, string | number>);
}

export async function getETFs() {
  return get<ETF[]>('/etfs');
}

export async function getETFSnapshot(ticker: string) {
  return get<ETFSnapshot>(`/etfs/${ticker}/market-snapshot`);
}

export async function getETFHistory(ticker: string, params?: { startTime?: number; endTime?: number }) {
  return get<ETFHistoryItem[]>(`/etfs/${ticker}/history`, params as Record<string, string | number>);
}

export async function getCurrencies() {
  return get<Currency[]>('/currencies');
}

export async function getCurrencySnapshot(id: string) {
  return get<CurrencySnapshot>(`/currencies/${id}/market-snapshot`);
}

export async function getCurrencyKlines(id: string, params: { interval: string; limit?: number }) {
  return get<Kline[]>(`/currencies/${id}/klines`, params as Record<string, string | number>);
}

export async function getSectorSpotlight() {
  return get<SectorData>('/currencies/sector-spotlight');
}

export async function getIndices() {
  return get<Index[]>('/indices');
}

export async function getIndexSnapshot(ticker: string) {
  return get<IndexSnapshot>(`/indices/${ticker}/market-snapshot`);
}

export async function getIndexConstituents(ticker: string) {
  return get<IndexConstituent[]>(`/indices/${ticker}/constituents`);
}

export async function getMacroEvents(params: { date: string }) {
  return get<MacroEvent[]>('/macro/events', params);
}

export async function getBTCTreasuries() {
  return get<BTCTreasury[]>('/btc-treasuries');
}

export async function getFundraisingProjects() {
  return get<FundraisingProject[]>('/fundraising/projects');
}

// Types
export interface NewsItem {
  id: string;
  title: string;
  content?: string;
  release_time: string;
  source_link?: string;
  categories?: string[];
  currencies?: string[];
}

export interface ETF {
  ticker: string;
  name: string;
  assetType: string;
  currency: string;
}

export interface ETFSummary {
  date: string;
  total_net_assets: number;
  total_net_inflow: number;
  total_value_traded?: number;
  cum_net_inflow?: number;
}

export interface ETFSnapshot {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  netInflow: number;
  netAssets: number;
  volume: number;
}

export interface ETFHistoryItem {
  date: string;
  price: number;
  netInflow: number;
  netAssets: number;
  volume: number;
}

export interface Currency {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  sectors: string[];
}

export interface CurrencySnapshot {
  id: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  change7d: number;
}

export interface Kline {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SectorData {
  sectors: { name: string; change24h: number; marketCap: number }[];
  spotlight: Currency[];
}

export interface Index {
  ticker: string;
  name: string;
  description: string;
}

export interface IndexSnapshot {
  ticker?: string;
  price: number;
  change_pct_24h: number;
  roi_7d?: number;
  roi_1m?: number;
}

export interface IndexConstituent {
  symbol: string;
  name: string;
  weight: number;
  price: number;
  change24h: number;
}

export interface MacroEvent {
  event: string;
  date: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BTCTreasury {
  ticker: string;
  company: string;
  btcHoldings: number;
  btcValue: number;
  country: string;
}

export interface FundraisingProject {
  projectId: string;
  name: string;
  totalRaised: number;
  sector: string;
  stage: string;
  date: string;
}
