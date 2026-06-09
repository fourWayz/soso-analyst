import { NextResponse } from "next/server";
import { computeAllSectors } from "@/lib/conviction/engine";
import { generateAllNarratives } from "@/lib/claude";

export const dynamic = "force-dynamic";

const USE_MOCK = !process.env.SOSOVALUE_API_KEY || process.env.SOSOVALUE_API_KEY === "your_sosovalue_api_key_here";

export async function GET() {
  try {
    const signals = await computeAllSectors();
    const withNarratives = process.env.ANTHROPIC_API_KEY
      ? await generateAllNarratives(signals)
      : signals;

    console.log("[conviction] scores:", withNarratives.map(s => `${s.sector}:${s.overallScore}`).join(" "));
    return NextResponse.json({
      signals: withNarratives,
      timestamp: new Date().toISOString(),
      source: USE_MOCK ? "mock" : "live",
      aiNarratives: !!process.env.ANTHROPIC_API_KEY,
    });
  } catch (err) {
    console.error("Conviction engine error:", err);
    return NextResponse.json({ error: "Engine failed", detail: String(err) }, { status: 500 });
  }
}
