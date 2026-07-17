import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db/client';
import { reports } from '@/lib/db/schema';
import { querySimilarCorpus, type HorizonBucket } from '@/lib/db/queries/corpus';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-5';

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

const SYSTEM_PROMPT = `You are SoSo Analyst, an institutional-grade cryptocurrency research analyst.
You produce structured, data-driven research reports for on-chain finance professionals.
Your analysis is grounded in real data from SoSoValue Terminal (ETF flows, news, market data, indices).
Always cite specific data points. Be precise, professional, and actionable.

You have access to two tools:
1. query_verified_corpus — looks up historical base rates from SoSo Analyst's own verified track record: real published calls on an asset, scored against actual SoDEX price outcomes. When your report focuses on a specific asset and you're forming a directional view, call this first to ground your confidence in what has actually happened historically, rather than asserting a base rate from prior knowledge. If the corpus has no data for this asset (sampleSize: 0), say so plainly in the report rather than inventing a base rate.
2. submit_report — call this exactly once, when you are ready to finalize the report. This is the only way to produce your final output; plain text responses are not used.`;

const QUERY_CORPUS_TOOL: Anthropic.Tool = {
  name: 'query_verified_corpus',
  description:
    "Look up historical base rates from SoSo Analyst's verified call corpus for an asset — sample size, average return, and % of historical calls where price moved positive, at a given lookahead horizon. Use this to ground directional confidence in real outcomes rather than asserting a base rate from prior knowledge.",
  input_schema: {
    type: 'object',
    properties: {
      asset: { type: 'string', description: 'Asset symbol, e.g. BTC, ETH, SOL, LINK' },
      horizon_bucket: {
        type: 'string',
        enum: ['plus1d', 'plus3d', 'plus7d'],
        description: 'Optional lookahead window to filter by. Omit to aggregate across all resolved calls on this asset.',
      },
    },
    required: ['asset'],
  },
};

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'Finalize and submit the research report. Call this exactly once, when ready.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Compelling headline' },
      subtitle: { type: 'string', description: 'One-line context' },
      publishedAt: { type: 'string', description: 'ISO 8601 timestamp' },
      signal: { type: 'string', enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] },
      confidence: { type: 'number', description: '0-100' },
      executiveSummary: { type: 'string', description: '2-3 sentence executive summary with key data points' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            content: { type: 'string', description: '2-4 sentences' },
          },
          required: ['heading', 'content'],
        },
        description: '3-5 sections',
      },
      keyRisks: { type: 'array', items: { type: 'string' } },
      actionableInsight: { type: 'string', description: 'Specific, data-backed conclusion' },
      tradeIdea: {
        type: 'object',
        properties: {
          asset: { type: 'string', description: 'e.g. BTC' },
          direction: { type: 'string', enum: ['LONG', 'SHORT'] },
          entryRationale: { type: 'string', description: '1-2 sentences' },
          targetSymbol: { type: 'string', description: 'SoDEX symbol e.g. vBTC_vUSDC' },
        },
        required: ['asset', 'direction', 'entryRationale', 'targetSymbol'],
      },
      citations: { type: 'array', items: { type: 'string' }, description: 'Cite specific data points from the input data' },
    },
    required: ['title', 'subtitle', 'publishedAt', 'signal', 'confidence', 'executiveSummary', 'sections', 'keyRisks', 'actionableInsight', 'citations'],
  },
};

const MAX_TOOL_ITERATIONS = 4;

export async function generateReport(input: ReportInput): Promise<GeneratedReport> {
  const prompt = buildPrompt(input);

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [QUERY_CORPUS_TOOL, { ...SUBMIT_REPORT_TOOL, cache_control: { type: 'ephemeral' } }],
      tool_choice: { type: 'any' },
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    messages.push({ role: 'assistant', content: response.content });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    const submitBlock = toolUseBlocks.find((b) => b.name === 'submit_report');
    if (submitBlock) {
      const report = submitBlock.input as GeneratedReport;
      await logReport(input, report, totalInputTokens, totalOutputTokens);
      return report;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      if (block.name === 'query_verified_corpus') {
        const args = block.input as { asset: string; horizon_bucket?: HorizonBucket };
        const result = await querySimilarCorpus({ asset: args.asset, horizonBucket: args.horizon_bucket });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
    }

    if (toolResults.length === 0) {
      // Model called a tool we don't recognize, or none at all — nothing to
      // feed back, so stop rather than loop forever.
      break;
    }

    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('Claude did not submit a report within the tool-use iteration limit');
}

async function logReport(
  input: ReportInput,
  output: GeneratedReport,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  await db.insert(reports).values({
    type: input.type,
    inputSnapshot: input,
    outputJson: output,
    model: MODEL,
    promptTokens,
    completionTokens,
  });
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

${input.asset ? `Before forming your directional view, consider calling query_verified_corpus with asset="${input.asset}" to check SoSo Analyst's own historical track record on this asset.` : ''}

When ready, call submit_report with the finalized report. Include 3-5 sections. All data claims must cite SoSoValue sources. Today is ${new Date().toISOString().split('T')[0]}.`;
}
