import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getLeaderboard } from "@/lib/db/queries/leaderboard";

const CACHE_KEY = "leaderboard:v1";
const CACHE_TTL_SECONDS = 60;

export async function GET() {
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    return NextResponse.json({ leaderboard: cached, cached: true });
  }

  const leaderboard = await getLeaderboard(50);
  await redis.set(CACHE_KEY, leaderboard, { ex: CACHE_TTL_SECONDS });

  return NextResponse.json({ leaderboard, cached: false });
}
