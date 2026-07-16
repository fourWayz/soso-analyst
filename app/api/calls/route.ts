import { NextRequest, NextResponse } from "next/server";
import type { Hex } from "viem";
import { requireWallet, UnauthorizedError } from "@/lib/auth/session";
import { publishRateLimit } from "@/lib/rate-limit";
import { verifyCallSignature, hashThesis, type CallPayload } from "@/lib/calls-eip712";
import { sodexSymbolFor } from "@/lib/sodex-symbols";
import { getTickers } from "@/lib/sodex";
import { createCall, listCalls } from "@/lib/db/queries/calls";
import { HORIZON_OPTIONS_HOURS, type Direction } from "@/lib/scoring";

const DIRECTIONS: Direction[] = ["BULLISH", "BEARISH", "NEUTRAL"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const author = searchParams.get("author") ?? undefined;
  const asset = searchParams.get("asset") ?? undefined;
  const status = searchParams.get("status") as "open" | "resolved" | "disputed" | null;

  const rows = await listCalls({
    author,
    asset,
    status: status ?? undefined,
    limit: 50,
  });

  return NextResponse.json({ calls: rows });
}

export async function POST(req: NextRequest) {
  let wallet: string;
  try {
    wallet = await requireWallet();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Sign in with your wallet first" }, { status: 401 });
    }
    throw err;
  }

  const { success } = await publishRateLimit.limit(wallet);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded — max 5 calls per 10 minutes" }, { status: 429 });
  }

  const body = await req.json();
  const { asset, direction, confidence, targetPrice, thesisText, horizonHours, publishedAt, signature } = body ?? {};

  if (typeof asset !== "string" || !asset.trim()) {
    return NextResponse.json({ error: "asset is required" }, { status: 400 });
  }
  if (!DIRECTIONS.includes(direction)) {
    return NextResponse.json({ error: `direction must be one of ${DIRECTIONS.join(", ")}` }, { status: 400 });
  }
  if (typeof confidence !== "number" || confidence < 0 || confidence > 100) {
    return NextResponse.json({ error: "confidence must be a number between 0 and 100" }, { status: 400 });
  }
  if (typeof thesisText !== "string" || thesisText.trim().length < 10) {
    return NextResponse.json({ error: "thesisText must be at least 10 characters" }, { status: 400 });
  }
  if (!HORIZON_OPTIONS_HOURS.includes(horizonHours)) {
    return NextResponse.json({ error: `horizonHours must be one of ${HORIZON_OPTIONS_HOURS.join(", ")}` }, { status: 400 });
  }
  if (typeof publishedAt !== "number") {
    return NextResponse.json({ error: "publishedAt (unix seconds) is required" }, { status: 400 });
  }
  if (typeof signature !== "string") {
    return NextResponse.json({ error: "signature is required" }, { status: 400 });
  }

  const normalizedAsset = asset.trim().toUpperCase();
  const normalizedTargetPrice: string = typeof targetPrice === "string" ? targetPrice : "";

  const payload: CallPayload = {
    asset: normalizedAsset,
    direction,
    confidence,
    targetPrice: normalizedTargetPrice,
    thesisText,
    horizonHours,
    publishedAt,
  };

  let recovered: Hex;
  try {
    recovered = await verifyCallSignature(payload, signature as Hex);
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  if (recovered.toLowerCase() !== wallet.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match your session wallet" }, { status: 401 });
  }

  // Entry price is fetched server-side, never trusted from the client — a
  // caller can't backdate a favorable entry to game their own outcome.
  const sodexSymbol = sodexSymbolFor(normalizedAsset);
  let entryPrice: number | null = null;
  if (sodexSymbol) {
    try {
      const [ticker] = await getTickers(sodexSymbol);
      entryPrice = ticker ? parseFloat(ticker.lastPx) : null;
    } catch {
      entryPrice = null;
    }
  }

  const row = await createCall({
    authorWallet: wallet,
    asset: normalizedAsset,
    direction,
    confidence,
    targetPrice: normalizedTargetPrice || null,
    entryPrice,
    thesisText,
    thesisHash: hashThesis(thesisText),
    signature,
    horizonHours,
    publishedAt: new Date(publishedAt * 1000),
  });

  return NextResponse.json({ call: row }, { status: 201 });
}
