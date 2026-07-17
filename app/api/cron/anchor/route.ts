import { NextRequest, NextResponse } from "next/server";
import type { Hex } from "viem";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { getThesisHashesForRange, upsertDailyAnchor } from "@/lib/db/queries/anchors";
import { computeMerkleRoot } from "@/lib/merkle";
import { broadcastAnchor } from "@/lib/anchor-chain";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Anchor "yesterday" (UTC) — the day is fully closed by the time this runs.
  const now = new Date();
  const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayStart = new Date(dayEnd.getTime() - 24 * 3_600_000);
  const dateStr = dayStart.toISOString().split("T")[0];

  const hashes = await getThesisHashesForRange(dayStart, dayEnd);
  if (hashes.length === 0) {
    return NextResponse.json({ date: dateStr, callCount: 0, anchored: false });
  }

  const merkleRoot = computeMerkleRoot(hashes as Hex[]);
  const txHash = await broadcastAnchor(merkleRoot);

  await upsertDailyAnchor({ date: dateStr, merkleRoot, txHash, callCount: hashes.length });

  return NextResponse.json({ date: dateStr, callCount: hashes.length, merkleRoot, txHash, anchored: txHash !== null });
}
