import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.sosovalue.com/open/v1';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') ?? '/news';
  const forwardParams = new URLSearchParams();
  searchParams.forEach((v, k) => { if (k !== 'path') forwardParams.set(k, v); });

  const url = `${BASE_URL}${path}${forwardParams.toString() ? '?' + forwardParams.toString() : ''}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        ...(process.env.SOSOVALUE_API_KEY ? { 'X-API-KEY': process.env.SOSOVALUE_API_KEY } : {}),
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `SoSoValue API returned ${res.status}`, path }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err), path }, { status: 500 });
  }
}
