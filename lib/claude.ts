import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReportInput {
  type: 'daily_brief' | 'asset_deep_dive' | 'theme_report';
  asset?: string;
  theme?: string;
  news: NewsContext[];
  etfFlows?: ETFFlowContext;
  marketData?: MarketContext;
  indices?: IndexContext[];
  macroEvents?: MacroEventContext[];
  sectorData?: SectorContext;
}

export interface NewsContext {
  title: string;
  summary: string;
  source: string;
  publishTime: number;
  categories: string[];
}

export interface ETFFlowContext {
  totalNetInflow: number;
  btcNetInflow?: number;
  ethNetInflow?: number;
  date: string;
  trend7d: number[];
}

export interface MarketContext {
  symbol: string;
  price: number;
  change24h: number;
  change7d?: number;
  marketCap: number;
  volume24h: number;
}

export interface IndexContext {
  ticker: string;
  name: string;
  value: number;
  change24h: number;
}

export interface MacroEventContext {
  event: string;
  date: string;
  impact: string;
  actual?: string;
  forecast?: string;
}

export interface SectorContext {
  sectors: { name: string; change24h: number }[];
}

export interface GeneratedReport {
  title: string;
  subtitle: string;
  publishedAt: string;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  executiveSummary: string;
  sections: ReportSection[];
  keyRisks: string[];
  actionableInsight: string;
  tradeIdea?: TradeIdea;
  citations: string[];
}

export interface ReportSection {
  heading: string;
  content: string;
}

export interface TradeIdea {
  asset: string;
  direction: 'LONG' | 'SHORT';
  entryRationale: string;
  targetSymbol: string;
}

export async function generateReport(input: ReportInput): Promise<GeneratedReport> {
  const prompt = buildPrompt(input);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are SoSo Analyst, an institutional-grade cryptocurrency research analyst.
You produce structured, data-driven research reports for on-chain finance professionals.
Your analysis is grounded in real data from SoSoValue Terminal (ETF flows, news, market data, indices).
Always cite specific data points. Be precise, professional, and actionable.
Respond ONLY with valid JSON matching the GeneratedReport schema.`,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse report JSON from Claude');

  return JSON.parse(jsonMatch[0]) as GeneratedReport;
}

function buildPrompt(input: ReportInput): string {
  const newsText = input.news
    .slice(0, 12)
    .map(n => `[${new Date(n.publishTime).toISOString()}] ${n.title} (${n.source}) — ${n.summary}`)
    .join('\n');

  const etfText = input.etfFlows
    ? `ETF Flows: Total net inflow = $${(input.etfFlows.totalNetInflow / 1e6).toFixed(1)}M, BTC ETF = $${((input.etfFlows.btcNetInflow ?? 0) / 1e6).toFixed(1)}M, ETH ETF = $${((input.etfFlows.ethNetInflow ?? 0) / 1e6).toFixed(1)}M (date: ${input.etfFlows.date})`
    : '';

  const marketText = input.marketData
    ? `Market: ${input.marketData.symbol} @ $${input.marketData.price.toLocaleString()}, 24h: ${input.marketData.change24h >= 0 ? '+' : ''}${input.marketData.change24h.toFixed(2)}%, MarketCap: $${(input.marketData.marketCap / 1e9).toFixed(1)}B, Volume: $${(input.marketData.volume24h / 1e6).toFixed(0)}M`
    : '';

  const indicesText = (input.indices ?? [])
    .map(i => `${i.name} (${i.ticker}): ${i.value.toFixed(2)}, 24h: ${i.change24h >= 0 ? '+' : ''}${i.change24h.toFixed(2)}%`)
    .join('\n');

  const macroText = (input.macroEvents ?? [])
    .map(e => `${e.event} (${e.date}, Impact: ${e.impact}): Actual=${e.actual ?? 'N/A'}, Forecast=${e.forecast ?? 'N/A'}`)
    .join('\n');

  const sectorText = (input.sectorData?.sectors ?? [])
    .map(s => `${s.name}: ${s.change24h >= 0 ? '+' : ''}${s.change24h.toFixed(2)}%`)
    .join(', ');

  let typeDescription = '';
  if (input.type === 'daily_brief') {
    typeDescription = 'Write a Daily Market Brief covering the overall crypto market';
  } else if (input.type === 'asset_deep_dive') {
    typeDescription = `Write an Asset Deep Dive research report for ${input.asset}`;
  } else if (input.type === 'theme_report') {
    typeDescription = `Write a Theme Report covering the "${input.theme}" narrative`;
  }

  return `${typeDescription} using the following real-time data from SoSoValue Terminal.

=== LIVE DATA ===
${etfText}
${marketText}

=== RECENT NEWS (last 24h from SoSoValue) ===
${newsText}

=== SSI INDICES ===
${indicesText || 'N/A'}

=== MACRO EVENTS ===
${macroText || 'N/A'}

=== SECTOR PERFORMANCE ===
${sectorText || 'N/A'}

Produce a professional research report as JSON with this exact schema:
{
  "title": "string — compelling headline",
  "subtitle": "string — one-line context",
  "publishedAt": "ISO 8601 timestamp",
  "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": number 0-100,
  "executiveSummary": "string — 2-3 sentence executive summary with key data points",
  "sections": [
    { "heading": "string", "content": "string — 2-4 sentences per section" }
  ],
  "keyRisks": ["string", ...],
  "actionableInsight": "string — specific, data-backed conclusion",
  "tradeIdea": {
    "asset": "string — asset name e.g. BTC",
    "direction": "LONG" | "SHORT",
    "entryRationale": "string — 1-2 sentences",
    "targetSymbol": "string — SoDEX symbol e.g. vBTC_vUSDC"
  },
  "citations": ["string — cite specific data points from the input data"]
}

Include 3-5 sections. All data claims must cite SoSoValue sources. Today is ${new Date().toISOString().split('T')[0]}.`;
}
