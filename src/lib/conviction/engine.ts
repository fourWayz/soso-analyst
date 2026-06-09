import type { Sector, FundraisingSignal, InstitutionalSignal, MacroConfirmation, ConvictionSignal } from "../types";
import { SECTOR_TOKEN_MAP } from "./sectorMap";
import {
  getBTCTreasuries, getBTCPurchaseHistory,
  getStockSnapshot, getETFSummaryHistory, getMacroEventHistory,
} from "../sosovalue/client";
import {
  mockFundraising, mockBTCTreasuries, mockBTCPurchases, mockStockSnapshots,
  mockETFHistory, mockMacroHistory, mockSectorData,
} from "../sosovalue/mock";

const USE_MOCK = !process.env.SOSOVALUE_API_KEY || process.env.SOSOVALUE_API_KEY === "your_sosovalue_api_key_here";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

// ── Layer 1: Fundraising ─────────────────────────────────────────────────────

export async function computeFundraisingSignal(sector: Sector): Promise<FundraisingSignal> {
  // SoSoValue /fundraising/projects only returns project_id + project_name; no sector/amount/date
  // in the list. Sector-level scoring requires mock data until a richer endpoint is available.
  const projects = mockFundraising;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const relevant = projects.filter(p => (p.sector ?? "").toUpperCase() === sector.toUpperCase());
  const recent = relevant.filter(p => now - new Date(p.date).getTime() < thirtyDays);

  const totalRaised = recent.reduce((s, p) => s + (p.amount ?? 0), 0);
  const recentRounds = recent.length;

  // Momentum: weighted score (recency + amount + round count)
  let momentum = 0;
  if (recentRounds > 0) {
    const amountScore = Math.min(100, (totalRaised / 50_000_000) * 50);  // $50M = 50pts
    const countScore = Math.min(50, recentRounds * 10);                  // 5+ rounds = 50pts
    momentum = Math.round(amountScore + countScore);
  }

  return {
    sector,
    projectCount: relevant.length,
    totalRaised,
    recentRounds,
    momentum,
    projects: recent.slice(0, 5).map(p => ({
      name: p.name, amount: p.amount, date: p.date, stage: p.stage,
    })),
  };
}

// ── Layer 2: Institutional accumulation ─────────────────────────────────────

export async function computeInstitutionalSignal(sector: Sector): Promise<InstitutionalSignal> {
  const stockTickers = ["MSTR", "COIN", "MARA", "RIOT"];

  // Run all independent API calls in parallel — avoids sequential 8s timeouts stacking up
  const [treasuries, purchases, ...stockSnaps] = await Promise.all([
    USE_MOCK ? Promise.resolve(mockBTCTreasuries) : safe(() => getBTCTreasuries(), mockBTCTreasuries),
    USE_MOCK ? Promise.resolve(mockBTCPurchases)  : safe(() => getBTCPurchaseHistory("MSTR", 10), mockBTCPurchases),
    ...stockTickers.map(ticker =>
      USE_MOCK
        ? Promise.resolve(mockStockSnapshots[ticker])
        : safe(() => getStockSnapshot(ticker), mockStockSnapshots[ticker])
    ),
  ]);

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const recentPurchases = purchases.filter(p => now - new Date(p.date).getTime() < thirtyDays);
  const recentBTC = recentPurchases.reduce((s, p) => s + p.amount, 0);

  const stockChanges = stockSnaps.map(s => s?.change ?? 0).filter(c => c !== 0);
  const avgStockMomentum = stockChanges.length
    ? stockChanges.reduce((a, b) => a + b, 0) / stockChanges.length
    : 0;

  // Institutional score
  const btcScore = Math.min(50, (recentBTC / 5000) * 50);          // 5000 BTC bought = 50pts
  const stockScore = Math.min(50, Math.max(0, avgStockMomentum * 5)); // 10% avg gain = 50pts
  const institutionalScore = Math.round(btcScore + stockScore);

  return {
    sector,
    btcTreasuryPurchases: recentBTC,
    btcCompanyCount: treasuries.length,
    cryptoStockMomentum: avgStockMomentum,
    institutionalScore,
    companies: treasuries.slice(0, 4).map(t => ({
      name: t.name, ticker: t.ticker,
      action: recentPurchases.length > 0 ? "BUY" : "HOLD",
      amount: recentPurchases[0]?.amount,
    })),
  };
}

// ── Layer 3: ETF + Macro confirmation ────────────────────────────────────────

export async function computeMacroConfirmation(): Promise<MacroConfirmation> {
  // Run ETF history and macro history in parallel
  const [etfHistory, fomcHistory] = await Promise.all([
    USE_MOCK ? Promise.resolve(mockETFHistory)   : safe(() => getETFSummaryHistory(14), mockETFHistory),
    USE_MOCK ? Promise.resolve(mockMacroHistory) : safe(() => getMacroEventHistory("FOMC Rate Decision", 6), mockMacroHistory),
  ]);

  // 7-day rolling net ETF flow
  const recent7 = etfHistory.slice(0, 7);
  const etfNetFlow = recent7.reduce((s, e) => s + e.totalNetFlow, 0);
  const etfFlowScore = Math.min(100, Math.max(0, 50 + (etfNetFlow / 100_000_000) * 10));

  const avgImpact = fomcHistory.length
    ? fomcHistory.reduce((s, e) => s + e.btcChange24h, 0) / fomcHistory.length
    : 0;

  const macroScore = Math.min(100, Math.max(0, 50 + avgImpact * 3));

  return {
    etfNetFlow,
    etfFlowScore: Math.round(etfFlowScore),
    upcomingEvents: [
      { name: "FOMC Rate Decision", date: "2026-05-07", historicalImpact: Math.round(avgImpact * 10) / 10 },
      { name: "US CPI", date: "2026-05-13", historicalImpact: -1.2 },
    ],
    macroScore: Math.round(macroScore),
  };
}

// ── Composite Conviction Score ───────────────────────────────────────────────

function scoreToDirection(score: number): ConvictionSignal["direction"] {
  if (score >= 75) return "STRONG_BUY";
  if (score >= 60) return "BUY";
  if (score >= 40) return "NEUTRAL";
  if (score >= 25) return "SELL";
  return "STRONG_SELL";
}

export async function computeConviction(sector: Sector): Promise<ConvictionSignal> {
  const [fundraising, institutional, macro] = await Promise.all([
    computeFundraisingSignal(sector),
    computeInstitutionalSignal(sector),
    computeMacroConfirmation(),
  ]);

  const layer1Score = fundraising.momentum;
  const layer2Score = institutional.institutionalScore;
  const layer3Score = macro.macroScore;

  const s1 = isNaN(layer1Score) ? 0 : layer1Score;
  const s2 = isNaN(layer2Score) ? 0 : layer2Score;
  const s3 = isNaN(layer3Score) ? 0 : layer3Score;
  // Weighted: L1 30% + L2 35% + L3 35%
  const overallScore = Math.round(s1 * 0.30 + s2 * 0.35 + s3 * 0.35);

  return {
    sector,
    layer1Score,
    layer2Score,
    layer3Score,
    overallScore,
    direction: scoreToDirection(overallScore),
    tokens: SECTOR_TOKEN_MAP[sector] ?? [],
    narrative: "",  // filled by Claude
    lastUpdated: new Date().toISOString(),
    fundraising,
    institutional,
    macro,
  };
}

export async function computeAllSectors(): Promise<ConvictionSignal[]> {
  const sectors: Sector[] = ["AI", "DePIN", "RWA", "DeFi", "L2", "L1", "GameFi", "Meme"];
  return Promise.all(sectors.map(computeConviction));
}
