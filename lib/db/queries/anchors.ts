import { and, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { calls, dailyAnchors } from "@/lib/db/schema";

export async function getThesisHashesForRange(start: Date, end: Date): Promise<string[]> {
  const rows = await db
    .select({ thesisHash: calls.thesisHash })
    .from(calls)
    .where(and(gte(calls.publishedAt, start), lt(calls.publishedAt, end)));
  return rows.map((r) => r.thesisHash);
}

export interface UpsertAnchorInput {
  date: string; // 'YYYY-MM-DD'
  merkleRoot: string;
  txHash: string | null;
  callCount: number;
}

export async function upsertDailyAnchor(input: UpsertAnchorInput): Promise<void> {
  await db
    .insert(dailyAnchors)
    .values(input)
    .onConflictDoUpdate({
      target: dailyAnchors.date,
      set: { merkleRoot: input.merkleRoot, txHash: input.txHash, callCount: input.callCount },
    });
}
