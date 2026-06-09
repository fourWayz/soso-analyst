import { NextResponse } from "next/server";
import { getTickers, mockTickers, getSymbols, mockSymbols } from "@/lib/sodex/client";
import type { SpotTicker } from "@/lib/sodex/client";

// The live SoDEX API uses different field names than our type — normalise either way.
function normalizeTicker(raw: Record<string, unknown>): SpotTicker {
  return {
    symbol:             String(raw.symbol             ?? ""),
    lastPrice:          String(raw.lastPrice          ?? raw.last          ?? raw.close         ?? raw.price         ?? "0"),
    priceChange:        String(raw.priceChange        ?? raw.change        ?? raw.price_change  ?? "0"),
    priceChangePercent: String(raw.priceChangePercent ?? raw.changePercent ?? raw.change_percent ?? raw.priceChangePct ?? raw.rate ?? "0"),
    volume:             String(raw.volume             ?? raw.vol           ?? raw.baseVolume    ?? "0"),
    quoteVolume:        String(raw.quoteVolume        ?? raw.quote_volume  ?? raw.turnover      ?? "0"),
    high:               String(raw.high               ?? raw.high24h       ?? raw.highPrice     ?? "0"),
    low:                String(raw.low                ?? raw.low24h        ?? raw.lowPrice      ?? "0"),
  };
}

export async function GET() {
  try {
    const [rawTickers, symbols] = await Promise.all([
      getTickers().catch(() => null),
      getSymbols().catch(() => mockSymbols),
    ]);

    const tickers = rawTickers ?? mockTickers;
    const tickerMap = Array.isArray(tickers)
      ? Object.fromEntries(
          (tickers as unknown as Record<string, unknown>[])
            .map(t => normalizeTicker(t))
            .filter(t => t.symbol && t.lastPrice !== "0")
            .map(t => [t.symbol, t])
        )
      : Object.fromEntries(mockTickers.map(t => [t.symbol, t]));

    return NextResponse.json({ symbols, tickers: tickerMap });
  } catch {
    const tickerMap = Object.fromEntries(mockTickers.map(t => [t.symbol, t]));
    return NextResponse.json({ symbols: mockSymbols, tickers: tickerMap });
  }
}
