import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getCredibility } from "@/lib/db/queries/leaderboard";

const CACHE_TTL_SECONDS = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "wallet must be a valid 0x address" }, { status: 400 });
  }

  const normalized = wallet.toLowerCase();
  const cacheKey = `credibility:${normalized}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const credibility = await getCredibility(normalized);
  await redis.set(cacheKey, credibility, { ex: CACHE_TTL_SECONDS });

  return NextResponse.json(credibility);
}
