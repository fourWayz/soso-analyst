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

// Forward signed EIP-712 orders to SoDEX (POST /trade/orders/batch)
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') ?? '';
  const url = `${SPOT_ENDPOINT}${path}`;

  try {
    const body = await req.json();

    // Forward SoDEX EIP-712 auth headers when present
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const apiKey   = req.headers.get('x-api-key');
    const apiSign  = req.headers.get('x-api-sign');
    const apiNonce = req.headers.get('x-api-nonce');
    if (apiKey)   headers['X-API-Key']   = apiKey;
    if (apiSign)  headers['X-API-Sign']  = apiSign;
    if (apiNonce) headers['X-API-Nonce'] = apiNonce;

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: `SoDEX API returned ${res.status}`, detail: data, path }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err), path }, { status: 500 });
  }
}
