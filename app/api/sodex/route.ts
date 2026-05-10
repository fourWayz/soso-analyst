import { NextRequest, NextResponse } from 'next/server';

const SPOT_ENDPOINT = 'https://api.sodex.com/spot/v1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') ?? '/markets/tickers';
  const forwardParams = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== 'path') forwardParams.set(k, v); });

  const url = `${SPOT_ENDPOINT}${path}${forwardParams.toString() ? '?' + forwardParams.toString() : ''}`;

  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });

    if (!res.ok) {
      return NextResponse.json({ error: `SoDEX API returned ${res.status}`, path }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err), path }, { status: 500 });
  }
}
