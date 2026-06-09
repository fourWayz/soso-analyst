// Realistic mock data for demo / when API key is absent
import type { ETFSummary, FundraisingProject, BTCTreasury, BTCPurchase, StockSnapshot, MacroEvent, MacroEventHistory, NewsItem, SectorData, IndexSnapshot } from "./client";

export const mockETFHistory: ETFSummary[] = [
  { date: "2026-06-08", totalNetFlow: 318_000_000,  btcFlow: 245_000_000, ethFlow: 73_000_000,  totalNetAsset: 118_400_000_000 },
  { date: "2026-06-07", totalNetFlow: -42_000_000,  btcFlow: -61_000_000, ethFlow: 19_000_000,  totalNetAsset: 118_100_000_000 },
  { date: "2026-06-06", totalNetFlow: 521_000_000,  btcFlow: 410_000_000, ethFlow: 111_000_000, totalNetAsset: 118_140_000_000 },
  { date: "2026-06-05", totalNetFlow: 189_000_000,  btcFlow: 140_000_000, ethFlow: 49_000_000,  totalNetAsset: 117_620_000_000 },
  { date: "2026-06-04", totalNetFlow: -88_000_000,  btcFlow: -95_000_000, ethFlow: 7_000_000,   totalNetAsset: 117_430_000_000 },
  { date: "2026-06-03", totalNetFlow: 672_000_000,  btcFlow: 510_000_000, ethFlow: 162_000_000, totalNetAsset: 117_520_000_000 },
  { date: "2026-06-02", totalNetFlow: 230_000_000,  btcFlow: 185_000_000, ethFlow: 45_000_000,  totalNetAsset: 116_850_000_000 },
];

export const mockFundraising: FundraisingProject[] = [
  { id: "1",  name: "Lumia Network",    sector: "L2",     stage: "Series A", amount: 15_000_000, date: "2026-06-07", investors: ["a16z", "Paradigm"] },
  { id: "2",  name: "Kaito AI",         sector: "AI",     stage: "Seed",     amount: 8_500_000,  date: "2026-06-05", investors: ["Multicoin", "Binance Labs"] },
  { id: "3",  name: "Hivemapper",       sector: "DePIN",  stage: "Series B", amount: 50_000_000, date: "2026-06-03", investors: ["Framework Ventures"] },
  { id: "4",  name: "Spectral Finance", sector: "DeFi",   stage: "Series A", amount: 22_000_000, date: "2026-06-01", investors: ["Spartan Group"] },
  { id: "5",  name: "Roam",             sector: "DePIN",  stage: "Seed",     amount: 3_500_000,  date: "2026-05-29", investors: ["OKX Ventures"] },
  { id: "6",  name: "Pell Network",     sector: "L2",     stage: "Seed",     amount: 5_000_000,  date: "2026-05-26", investors: ["HashKey"] },
  { id: "7",  name: "Aethir",           sector: "AI",     stage: "Series B", amount: 35_000_000, date: "2026-05-23", investors: ["Merit Circle", "Sanctor Capital"] },
  { id: "8",  name: "Plume Network",    sector: "RWA",    stage: "Series A", amount: 20_000_000, date: "2026-05-20", investors: ["Haun Ventures", "Galaxy Digital"] },
  { id: "9",  name: "Nillion",          sector: "AI",     stage: "Series A", amount: 25_000_000, date: "2026-05-17", investors: ["a16z Crypto", "Hack VC"] },
  { id: "10", name: "Ondo Finance",     sector: "RWA",    stage: "Series B", amount: 46_000_000, date: "2026-05-14", investors: ["BlackRock Strategic", "Coinbase Ventures"] },
  { id: "11", name: "EigenLayer AVS",   sector: "L1",     stage: "Series A", amount: 18_000_000, date: "2026-06-04", investors: ["Polychain", "Hack VC"] },
  { id: "12", name: "Pixelmon",         sector: "GameFi", stage: "Seed",     amount: 7_000_000,  date: "2026-05-31", investors: ["Andreessen Horowitz"] },
];

export const mockBTCTreasuries: BTCTreasury[] = [
  { ticker: "MSTR", name: "MicroStrategy", country: "US", totalBTC: 214_400, totalValue: 18_800_000_000 },
  { ticker: "MARA", name: "Marathon Digital", country: "US", totalBTC: 46_374, totalValue: 4_065_000_000 },
  { ticker: "RIOT", name: "Riot Platforms", country: "US", totalBTC: 18_221, totalValue: 1_597_000_000 },
  { ticker: "COIN", name: "Coinbase", country: "US", totalBTC: 9_480, totalValue: 831_000_000 },
  { ticker: "CLSK", name: "CleanSpark", country: "US", totalBTC: 11_177, totalValue: 979_000_000 },
];

export const mockBTCPurchases: BTCPurchase[] = [
  { date: "2026-06-05", amount: 1_500, price: 97_400, totalValue: 146_100_000 },
  { date: "2026-05-28", amount: 2_200, price: 94_800, totalValue: 208_560_000 },
  { date: "2026-05-19", amount: 800,   price: 91_200, totalValue: 72_960_000  },
  { date: "2026-05-12", amount: 3_100, price: 88_500, totalValue: 274_350_000 },
];

export const mockStockSnapshots: Record<string, StockSnapshot> = {
  MSTR: { ticker: "MSTR", price: 412.5, change: 4.2, marketCap: 82_000_000_000 },
  COIN: { ticker: "COIN", price: 238.7, change: 2.8, marketCap: 62_000_000_000 },
  MARA: { ticker: "MARA", price: 18.4, change: 6.1, marketCap: 4_200_000_000 },
  RIOT: { ticker: "RIOT", price: 11.2, change: 3.5, marketCap: 2_100_000_000 },
};

export const mockMacroEvents: MacroEvent[] = [
  { event: "FOMC Rate Decision", date: "2026-05-07", actual: undefined, forecast: 4.25, previous: 4.5, impact: "HIGH" },
  { event: "US CPI", date: "2026-05-13", actual: undefined, forecast: 2.8, previous: 3.1, impact: "HIGH" },
  { event: "US GDP", date: "2026-05-29", actual: undefined, forecast: 2.1, previous: 1.9, impact: "MEDIUM" },
];

export const mockMacroHistory: MacroEventHistory[] = [
  { date: "2026-03-19", actual: 4.5, forecast: 4.5, btcChange24h: 3.2, cryptoMarketChange: 4.1 },
  { date: "2026-01-29", actual: 4.5, forecast: 4.5, btcChange24h: -1.8, cryptoMarketChange: -2.3 },
  { date: "2025-12-18", actual: 4.5, forecast: 4.25, btcChange24h: -5.4, cryptoMarketChange: -6.1 },
  { date: "2025-11-07", actual: 4.75, forecast: 4.75, btcChange24h: 7.8, cryptoMarketChange: 9.2 },
];

export const mockNews: NewsItem[] = [
  { newsId: "n1", title: "VCs pour $200M into DePIN infrastructure this week", summary: "Major institutional investors are accelerating bets on decentralized physical infrastructure...", publishTime: "2026-06-08T08:00:00Z", categories: ["DePIN", "Funding"], currencyCodes: ["IOTX", "HONEY"] },
  { newsId: "n2", title: "AI agent tokens surge as Kaito raises $8.5M", summary: "The AI narrative is gaining fresh momentum after Kaito AI secured funding from top VCs...", publishTime: "2026-06-07T14:30:00Z", categories: ["AI", "Funding"], currencyCodes: ["KAI", "AGIX"] },
  { newsId: "n3", title: "MicroStrategy adds 1,500 BTC in latest purchase", summary: "Michael Saylor's firm continues systematic accumulation strategy...", publishTime: "2026-06-07T10:00:00Z", categories: ["BTC", "Institutional"], currencyCodes: ["BTC"] },
  { newsId: "n4", title: "BlackRock Bitcoin ETF sees $245M single-day inflow", summary: "IBIT recorded its fourth-largest daily inflow of the year...", publishTime: "2026-06-08T09:00:00Z", categories: ["ETF", "BTC"], currencyCodes: ["BTC"] },
  { newsId: "n5", title: "RWA tokenization crosses $20B in on-chain value", summary: "Real-world asset protocols led by Ondo Finance and Plume reach new milestones...", publishTime: "2026-06-06T16:00:00Z", categories: ["RWA", "DeFi"], currencyCodes: ["ONDO", "PLUME"] },
];

export const mockSectorData: SectorData = {
  sectors: [
    { name: "AI", change24h: 5.8, marketCap: 28_000_000_000, tokens: ["RENDER", "FET", "AGIX", "TAO"] },
    { name: "DePIN", change24h: 4.2, marketCap: 12_000_000_000, tokens: ["IOTX", "HNT", "MOBILE", "HONEY"] },
    { name: "RWA", change24h: 3.1, marketCap: 9_500_000_000, tokens: ["ONDO", "MKR", "CFG", "MPL"] },
    { name: "DeFi", change24h: 2.4, marketCap: 65_000_000_000, tokens: ["UNI", "AAVE", "CRV", "GMX"] },
    { name: "L2", change24h: 1.9, marketCap: 48_000_000_000, tokens: ["ARB", "OP", "MATIC", "BASE"] },
    { name: "L1", change24h: 1.2, marketCap: 420_000_000_000, tokens: ["ETH", "SOL", "AVAX", "ADA"] },
    { name: "GameFi", change24h: -0.8, marketCap: 8_000_000_000, tokens: ["AXS", "SAND", "MANA", "IMX"] },
    { name: "Meme", change24h: -2.1, marketCap: 55_000_000_000, tokens: ["DOGE", "SHIB", "PEPE", "WIF"] },
  ],
};

export const mockIndexSnapshots: IndexSnapshot[] = [
  { ticker: "SSIAI", value: 1842.5, change24h: 5.3 },
  { ticker: "SSIPIN", value: 621.8, change24h: 3.9 },
  { ticker: "SSIRWA", value: 445.2, change24h: 2.8 },
  { ticker: "SSIDEFI", value: 2341.0, change24h: 2.1 },
];
