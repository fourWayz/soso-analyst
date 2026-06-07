import { NextRequest, NextResponse } from 'next/server';

const SPOT_ENDPOINT = 'https://mainnet-gw.sodex.dev/api/v1/spot';

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

// Forward signed EIP-712 orders to SoDEX
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') ?? '';

  const url = `${SPOT_ENDPOINT}${path}`;

  try {
    const body = await req.json();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: `SoDEX API returned ${res.status}`, detail: data, path }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err), path }, { status: 500 });
  }
}
