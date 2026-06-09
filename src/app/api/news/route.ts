import { NextResponse } from "next/server";
import { getNewsFeed } from "@/lib/sosovalue/client";
import { mockNews } from "@/lib/sosovalue/mock";

export const dynamic = "force-dynamic";

const USE_MOCK = !process.env.SOSOVALUE_API_KEY || process.env.SOSOVALUE_API_KEY === "your_sosovalue_api_key_here";

export async function GET() {
  if (USE_MOCK) {
    return NextResponse.json({ news: mockNews, source: "mock", reason: "no_api_key" });
  }
  try {
    const news = await getNewsFeed(30);
    if (!news.length) {
      return NextResponse.json({ news: mockNews, source: "mock", reason: "empty_response" });
    }
    return NextResponse.json({ news, source: "live" });
  } catch (err) {
    console.error("[news route]", err);
    return NextResponse.json({ news: mockNews, source: "mock", reason: String(err) });
  }
}
