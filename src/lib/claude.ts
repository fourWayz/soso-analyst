import Anthropic from "@anthropic-ai/sdk";
import type { ConvictionSignal } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateNarrative(signal: ConvictionSignal): Promise<string> {
  const { sector, layer1Score, layer2Score, layer3Score, overallScore, direction, fundraising, institutional, macro } = signal;

  const prompt = `You are a senior crypto research analyst. Write a 2-sentence market narrative (max 80 words) explaining WHY the ${sector} sector has a conviction score of ${overallScore}/100 with direction ${direction}.

Key data:
- Fundraising Layer (${layer1Score}/100): ${fundraising?.recentRounds ?? 0} rounds in 30 days, $${((fundraising?.totalRaised ?? 0) / 1_000_000).toFixed(1)}M raised
- Institutional Layer (${layer2Score}/100): ${institutional?.btcTreasuryPurchases ?? 0} BTC purchased by treasuries, crypto stocks avg ${institutional?.cryptoStockMomentum?.toFixed(1) ?? 0}% move
- Macro/ETF Layer (${layer3Score}/100): ETF 7-day flow $${((macro?.etfNetFlow ?? 0) / 1_000_000).toFixed(0)}M

Be specific and analytical. No fluff. Focus on what EXPLAINS the convergence (or divergence) of signals.`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: "You are a terse, data-driven crypto analyst. No hype. Just signal.",
    messages: [{ role: "user", content: prompt }],
  });

  return (msg.content[0] as { text: string }).text.trim();
}

export async function generateAllNarratives(signals: ConvictionSignal[]): Promise<ConvictionSignal[]> {
  // Use haiku for cost efficiency; generate top 4 by score only
  const sorted = [...signals].sort((a, b) => b.overallScore - a.overallScore);
  const topN = sorted.slice(0, 4);

  const withNarratives = await Promise.all(
    topN.map(async (s) => {
      try {
        const narrative = await generateNarrative(s);
        return { ...s, narrative };
      } catch {
        return { ...s, narrative: "Narrative unavailable — check API key." };
      }
    })
  );

  // Merge back
  return signals.map(s => withNarratives.find(w => w.sector === s.sector) ?? s);
}
