import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { corpusEntries } from "@/lib/db/schema";

export interface InsertCorpusEntryInput {
  callId: string;
  asset: string;
  eventDayReturn: number;
  horizonHours: number;
}

// Buckets a resolved call's return into the nearest lookahead window. Each
// call has a single horizon, so only one bucket is populated per entry —
// query_verified_corpus (Tier 2) aggregates across many entries per bucket.
export async function insertCorpusEntry(input: InsertCorpusEntryInput): Promise<void> {
  await db.insert(corpusEntries).values({
    callId: input.callId,
    asset: input.asset,
    eventDayReturn: input.eventDayReturn,
    plus1d: input.horizonHours <= 24 ? input.eventDayReturn : null,
    plus3d: input.horizonHours === 72 ? input.eventDayReturn : null,
    plus7d: input.horizonHours === 168 ? input.eventDayReturn : null,
    plus30d: null,
    // Catalyst tagging and regime labeling aren't implemented yet — left
    // null rather than faked. See query_verified_corpus follow-up.
    catalystTags: null,
    regimeLabel: null,
  });
}

export type HorizonBucket = "plus1d" | "plus3d" | "plus7d";

export interface CorpusQueryResult {
  asset: string;
  horizonBucket: HorizonBucket | null;
  sampleSize: number;
  avgReturnPct: number | null;
  pctPositive: number | null;
}

// Read-side of the corpus: what actually happened, historically, to calls on
// this asset — used to ground the AI analyst's own reasoning rather than
// letting it assert base rates it has no grounding for.
export async function querySimilarCorpus(input: {
  asset: string;
  horizonBucket?: HorizonBucket;
}): Promise<CorpusQueryResult> {
  const conditions = [eq(corpusEntries.asset, input.asset.toUpperCase())];
  if (input.horizonBucket) {
    conditions.push(isNotNull(corpusEntries[input.horizonBucket]));
  }

  const rows = await db
    .select()
    .from(corpusEntries)
    .where(and(...conditions))
    .orderBy(desc(corpusEntries.createdAt))
    .limit(100);

  const returns = input.horizonBucket
    ? rows.map((r) => r[input.horizonBucket!]).filter((v): v is number => v !== null)
    : rows.map((r) => r.eventDayReturn).filter((v): v is number => v !== null);

  if (returns.length === 0) {
    return {
      asset: input.asset.toUpperCase(),
      horizonBucket: input.horizonBucket ?? null,
      sampleSize: 0,
      avgReturnPct: null,
      pctPositive: null,
    };
  }

  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const pctPositive = Math.round((returns.filter((r) => r > 0).length / returns.length) * 100);

  return {
    asset: input.asset.toUpperCase(),
    horizonBucket: input.horizonBucket ?? null,
    sampleSize: returns.length,
    avgReturnPct: Math.round(avg * 100) / 100,
    pctPositive,
  };
}
