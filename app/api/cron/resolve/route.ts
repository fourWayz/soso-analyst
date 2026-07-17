import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { getOpenCallsPastHorizon, resolveCall, getReputation, updateReputation } from "@/lib/db/queries/calls";
import { insertCorpusEntry } from "@/lib/db/queries/corpus";
import { sodexSymbolFor } from "@/lib/sodex-symbols";
import { getTickers } from "@/lib/sodex";
import { scoreCall, nextReputation, type Direction } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await getOpenCallsPastHorizon();
  let resolved = 0;
  let skipped = 0;

  for (const call of due) {
    const sodexSymbol = sodexSymbolFor(call.asset);
    const entryPrice = call.entryPrice !== null ? parseFloat(call.entryPrice) : null;

    if (!sodexSymbol || entryPrice === null) {
      // Shouldn't happen — createCall resolves these immediately — but skip
      // defensively rather than crash the whole batch on bad data.
      skipped++;
      continue;
    }

    let currentPrice: number | null = null;
    try {
      const [ticker] = await getTickers(sodexSymbol);
      currentPrice = ticker ? parseFloat(ticker.lastPx) : null;
    } catch {
      currentPrice = null;
    }

    if (currentPrice === null) {
      // Transient fetch failure — leave it open, retry next run.
      skipped++;
      continue;
    }

    const now = new Date();
    const result = scoreCall(call.direction as Direction, call.confidence, entryPrice, currentPrice);

    await resolveCall({
      id: call.id,
      resolutionPrice: currentPrice,
      resolutionPct: result.resolutionPct,
      score: result.score,
      outcome: result.outcome,
      resolvedAt: now,
    });

    if (result.score !== null) {
      const currentReputation = await getReputation(call.authorWallet);
      await updateReputation(call.authorWallet, nextReputation(currentReputation, result.score));

      await insertCorpusEntry({
        callId: call.id,
        asset: call.asset,
        eventDayReturn: result.resolutionPct!,
        horizonHours: call.horizonHours,
      });
    }

    resolved++;
  }

  return NextResponse.json({ resolved, skipped, checked: due.length });
}
