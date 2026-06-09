export type Sector =
  | "L1" | "L2" | "DeFi" | "RWA" | "DePIN" | "AI"
  | "GameFi" | "Meme" | "BTC" | "ETH" | "SOL" | "Other";

export interface FundraisingSignal {
  sector: Sector;
  projectCount: number;
  totalRaised: number;      // USD
  recentRounds: number;     // rounds in last 30 days
  momentum: number;         // 0-100, higher = more activity
  projects: Array<{
    name: string;
    amount: number;
    date: string;
    stage: string;
  }>;
}

export interface InstitutionalSignal {
  sector: Sector;
  btcTreasuryPurchases: number;  // BTC purchased recently
  btcCompanyCount: number;
  cryptoStockMomentum: number;   // avg stock price change %
  institutionalScore: number;    // 0-100
  companies: Array<{
    name: string;
    ticker: string;
    action: string;
    amount?: number;
  }>;
}

export interface MacroConfirmation {
  etfNetFlow: number;            // USD net inflow/outflow
  etfFlowScore: number;          // 0-100
  upcomingEvents: Array<{
    name: string;
    date: string;
    historicalImpact: number;    // -100 to 100
  }>;
  macroScore: number;            // 0-100
}

export interface ConvictionSignal {
  sector: Sector;
  layer1Score: number;           // Fundraising (0-100)
  layer2Score: number;           // Institutional (0-100)
  layer3Score: number;           // Macro/ETF (0-100)
  overallScore: number;          // Weighted composite (0-100)
  direction: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  tokens: string[];              // Top tokens in sector
  narrative: string;             // Claude-generated narrative
  lastUpdated: string;
  fundraising?: FundraisingSignal;
  institutional?: InstitutionalSignal;
  macro?: MacroConfirmation;
}

export interface MarketSnapshot {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export interface ExecutionOrder {
  market: string;
  side: "BUY" | "SELL";
  amount: number;
  price?: number;              // limit price, undefined = market
  stopLoss?: number;
  takeProfit?: number;
}

export interface SoSoNews {
  newsId: string;
  title: string;
  summary: string;
  publishTime: string;
  categories: string[];
  currencyCodes: string[];
}
