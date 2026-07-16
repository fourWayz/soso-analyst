import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { calls, users } from "@/lib/db/schema";
import { isPastHorizon, type Direction, type Outcome } from "@/lib/scoring";

export type CallRow = typeof calls.$inferSelect;

export interface CreateCallInput {
  authorWallet: string;
  asset: string;
  direction: Direction;
  confidence: number;
  targetPrice: string | null;
  entryPrice: number | null;
  thesisText: string;
  thesisHash: string;
  signature: string;
  horizonHours: number;
  publishedAt: Date;
}

export async function createCall(input: CreateCallInput): Promise<CallRow> {
  // A call with no entry price has nothing to resolve against — publish it
  // already-resolved rather than leaving it open forever.
  const unscored = input.entryPrice === null || input.direction === "NEUTRAL";

  const [row] = await db
    .insert(calls)
    .values({
      authorWallet: input.authorWallet,
      asset: input.asset,
      direction: input.direction,
      confidence: input.confidence,
      targetPrice: input.targetPrice,
      entryPrice: input.entryPrice !== null ? String(input.entryPrice) : null,
      thesisText: input.thesisText,
      thesisHash: input.thesisHash,
      signature: input.signature,
      horizonHours: input.horizonHours,
      publishedAt: input.publishedAt,
      status: unscored ? "resolved" : "open",
      outcome: unscored ? "UNSCORED" : null,
      resolvedAt: unscored ? input.publishedAt : null,
    })
    .returning();

  return row;
}

export interface ListCallsFilters {
  author?: string;
  asset?: string;
  status?: "open" | "resolved" | "disputed";
  limit?: number;
}

export async function listCalls(filters: ListCallsFilters = {}): Promise<CallRow[]> {
  const conditions = [];
  if (filters.author) conditions.push(eq(calls.authorWallet, filters.author.toLowerCase()));
  if (filters.asset) conditions.push(eq(calls.asset, filters.asset.toUpperCase()));
  if (filters.status) conditions.push(eq(calls.status, filters.status));

  return db
    .select()
    .from(calls)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(calls.publishedAt))
    .limit(filters.limit ?? 50);
}

export async function getOpenCallsPastHorizon(now: Date = new Date()): Promise<CallRow[]> {
  const open = await db.select().from(calls).where(eq(calls.status, "open"));
  return open.filter((c) => isPastHorizon(c.publishedAt, c.horizonHours, now));
}

export interface ResolveCallInput {
  id: string;
  resolutionPrice: number;
  resolutionPct: number | null;
  score: number | null;
  outcome: Outcome;
  resolvedAt: Date;
}

export async function resolveCall(input: ResolveCallInput): Promise<void> {
  await db
    .update(calls)
    .set({
      status: "resolved",
      resolutionPrice: String(input.resolutionPrice),
      resolutionPct: input.resolutionPct,
      score: input.score,
      outcome: input.outcome,
      resolvedAt: input.resolvedAt,
    })
    .where(eq(calls.id, input.id));
}

export async function updateReputation(wallet: string, reputationScore: number): Promise<void> {
  await db.update(users).set({ reputationScore }).where(eq(users.walletAddress, wallet));
}

export async function getReputation(wallet: string): Promise<number> {
  const [row] = await db
    .select({ reputationScore: users.reputationScore })
    .from(users)
    .where(eq(users.walletAddress, wallet));
  return row?.reputationScore ?? 0;
}
