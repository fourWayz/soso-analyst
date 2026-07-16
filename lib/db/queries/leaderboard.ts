import { desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, calls } from "@/lib/db/schema";
import { computeHitRate, type Outcome } from "@/lib/scoring";

export interface LeaderboardEntry {
  walletAddress: string;
  displayName: string | null;
  isAgent: boolean;
  reputationScore: number;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({
      walletAddress: users.walletAddress,
      displayName: users.displayName,
      isAgent: users.isAgent,
      reputationScore: users.reputationScore,
    })
    .from(users)
    .orderBy(desc(users.reputationScore))
    .limit(limit);

  return rows;
}

export interface CredibilityResult {
  walletAddress: string;
  reputationScore: number;
  totalCalls: number;
  scoredCalls: number;
  hitRate: number | null;
}

export async function getCredibility(wallet: string): Promise<CredibilityResult> {
  const normalized = wallet.toLowerCase();

  const [userRow] = await db
    .select({ reputationScore: users.reputationScore })
    .from(users)
    .where(eq(users.walletAddress, normalized));

  const resolvedCalls = await db
    .select({ outcome: calls.outcome })
    .from(calls)
    .where(and(eq(calls.authorWallet, normalized), eq(calls.status, "resolved")));

  const outcomes = resolvedCalls.map((c) => c.outcome).filter((o): o is Outcome => o !== null);

  return {
    walletAddress: normalized,
    reputationScore: userRow?.reputationScore ?? 0,
    totalCalls: resolvedCalls.length,
    scoredCalls: outcomes.filter((o) => o === "HIT" || o === "MISS").length,
    hitRate: computeHitRate(outcomes),
  };
}
