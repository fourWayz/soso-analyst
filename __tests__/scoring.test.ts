import { describe, it, expect } from "vitest";
import { scoreCall, isPastHorizon, nextReputation, computeHitRate } from "@/lib/scoring";

describe("scoreCall", () => {
  it("returns UNSCORED for NEUTRAL calls", () => {
    const result = scoreCall("NEUTRAL", 80, 100, 110);
    expect(result.outcome).toBe("UNSCORED");
    expect(result.score).toBeNull();
  });

  it("returns UNSCORED when price data is missing", () => {
    expect(scoreCall("BULLISH", 80, null, 110).outcome).toBe("UNSCORED");
    expect(scoreCall("BULLISH", 80, 100, null).outcome).toBe("UNSCORED");
  });

  it("scores a correct BULLISH call as HIT with a positive score", () => {
    const result = scoreCall("BULLISH", 80, 100, 110);
    expect(result.outcome).toBe("HIT");
    expect(result.resolutionPct).toBeCloseTo(10);
    expect(result.score).toBeGreaterThan(0);
  });

  it("scores an incorrect BULLISH call as MISS with a negative score", () => {
    const result = scoreCall("BULLISH", 80, 100, 90);
    expect(result.outcome).toBe("MISS");
    expect(result.score).toBeLessThan(0);
  });

  it("scores a correct BEARISH call as HIT", () => {
    const result = scoreCall("BEARISH", 50, 100, 90);
    expect(result.outcome).toBe("HIT");
    expect(result.score).toBeGreaterThan(0);
  });

  it("treats exact breakeven as MISS for both directions, not a sign-derived no-op", () => {
    // Regression guard: score can be -0 at breakeven, and `-0 < 0` is false
    // in JS — outcome must come from the explicit branch, not score's sign.
    const bullish = scoreCall("BULLISH", 80, 100, 100);
    const bearish = scoreCall("BEARISH", 80, 100, 100);
    expect(bullish.outcome).toBe("MISS");
    expect(bearish.outcome).toBe("MISS");
  });

  it("scales score magnitude with confidence", () => {
    const highConfidence = scoreCall("BULLISH", 100, 100, 110);
    const lowConfidence = scoreCall("BULLISH", 20, 100, 110);
    expect(Math.abs(highConfidence.score!)).toBeGreaterThan(Math.abs(lowConfidence.score!));
  });
});

describe("isPastHorizon", () => {
  it("is false before the horizon elapses", () => {
    const publishedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isPastHorizon(publishedAt, 24, now)).toBe(false);
  });

  it("is true once the horizon elapses", () => {
    const publishedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-02T01:00:00Z");
    expect(isPastHorizon(publishedAt, 24, now)).toBe(true);
  });

  it("is true exactly at the boundary", () => {
    const publishedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-02T00:00:00Z");
    expect(isPastHorizon(publishedAt, 24, now)).toBe(true);
  });
});

describe("nextReputation", () => {
  it("blends the new score in at the given alpha", () => {
    expect(nextReputation(10, 20, 0.2)).toBeCloseTo(10 * 0.8 + 20 * 0.2);
  });

  it("defaults to an alpha of 0.2", () => {
    expect(nextReputation(0, 10)).toBeCloseTo(2);
  });
});

describe("computeHitRate", () => {
  it("returns null when there are no scored outcomes", () => {
    expect(computeHitRate([])).toBeNull();
    expect(computeHitRate(["UNSCORED", "UNSCORED"])).toBeNull();
  });

  it("computes the percentage of HIT among scored outcomes", () => {
    expect(computeHitRate(["HIT", "HIT", "MISS", "UNSCORED"])).toBe(67);
  });
});
