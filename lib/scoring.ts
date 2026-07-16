export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";
export type Outcome = "HIT" | "MISS" | "UNSCORED";

export interface ScoreResult {
  outcome: Outcome;
  resolutionPct: number | null;
  score: number | null;
}

// Magnitude- and confidence-weighted score: positive when the direction call
// was correct, scaled by how far price actually moved and by the analyst's
// stated confidence. NEUTRAL calls and calls with no price data never resolve
// to HIT/MISS — there's nothing falsifiable to grade.
export function scoreCall(
  direction: Direction,
  confidence: number,
  entryPrice: number | null,
  resolutionPrice: number | null,
): ScoreResult {
  if (direction === "NEUTRAL" || entryPrice === null || resolutionPrice === null) {
    return { outcome: "UNSCORED", resolutionPct: null, score: null };
  }

  const resolutionPct = ((resolutionPrice - entryPrice) / entryPrice) * 100;
  const directionCorrect = direction === "BULLISH" ? resolutionPct > 0 : resolutionPct < 0;
  const outcome: Outcome = directionCorrect ? "HIT" : "MISS";
  const score = (directionCorrect ? 1 : -1) * Math.abs(resolutionPct) * (confidence / 100);

  return { outcome, resolutionPct, score };
}

export const HORIZON_OPTIONS_HOURS = [1, 24, 72, 168] as const;
export type HorizonHours = (typeof HORIZON_OPTIONS_HOURS)[number];

export function isPastHorizon(publishedAt: Date, horizonHours: number, now: Date = new Date()): boolean {
  return now.getTime() - publishedAt.getTime() >= horizonHours * 3_600_000;
}

// Rolling reputation: an EMA so recent calls weigh more than the full
// history, but no single bad call can tank a long track record.
export function nextReputation(currentReputation: number, callScore: number, alpha = 0.2): number {
  return currentReputation * (1 - alpha) + callScore * alpha;
}

export function computeHitRate(outcomes: Outcome[]): number | null {
  const scored = outcomes.filter((o) => o === "HIT" || o === "MISS");
  if (scored.length === 0) return null;
  return Math.round((outcomes.filter((o) => o === "HIT").length / scored.length) * 100);
}
