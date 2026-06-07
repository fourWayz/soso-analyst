import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    // Fetch live context in parallel
    const [newsRes, etfRes, tickerRes] = await Promise.all([
      fetch('https://openapi.sosovalue.com/openapi/v1/news/hot', {
        headers: { 'x-soso-api-key': process.env.SOSOVALUE_API_KEY ?? '' },
      }).then(r => r.json()).catch(() => null),
      fetch('https://openapi.sosovalue.com/openapi/v1/etfs/summary-history?symbol=BTC&country_code=US', {
        headers: { 'x-soso-api-key': process.env.SOSOVALUE_API_KEY ?? '' },
      }).then(r => r.json()).catch(() => null),
      fetch('https://mainnet-gw.sodex.dev/api/v1/spot/markets/tickers')
        .then(r => r.json()).catch(() => null),
    ]);

    const headlines: string[] = (Array.isArray(newsRes?.data?.list) ? newsRes.data.list : [])
      .slice(0, 5)
      .map((n: { title: string }) => n.title);

    const etfArr = Array.isArray(etfRes?.data) ? etfRes.data : [];
    const latest = etfArr[etfArr.length - 1];
    const etfLine = latest
      ? `BTC ETF net inflow: ${latest.total_net_inflow >= 0 ? '+' : ''}$${(latest.total_net_inflow / 1e6).toFixed(0)}M (${latest.date})`
      : '';

    const tickers: { symbol: string; lastPx: string; changePct: number }[] =
      Array.isArray(tickerRes?.data) ? tickerRes.data : [];
    const btcTicker = tickers.find(t => t.symbol === 'vBTC_vUSDC');
    const btcLine = btcTicker
      ? `BTC/USDC: $${parseFloat(btcTicker.lastPx).toLocaleString()} (${btcTicker.changePct >= 0 ? '+' : ''}${btcTicker.changePct.toFixed(2)}% 24h)`
      : '';

    const prompt = `You are a concise crypto market analyst. Based on this real-time data, generate a market alert.

LIVE DATA:
${btcLine}
${etfLine}
Top headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Respond with ONLY valid JSON:
{
  "signal": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": <number 0-100>,
  "headline": "<compelling one-line headline, max 80 chars>",
  "alert": "<2 sentences max — specific data-backed market observation>",
  "asset": "BTC",
  "targetSymbol": "vBTC_vUSDC",
  "publishedAt": "${new Date().toISOString()}"
}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in Claude response');

    const alert = JSON.parse(match[0]);
    return NextResponse.json({ ...alert, generatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
