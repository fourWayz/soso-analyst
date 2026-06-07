import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://openapi.sosovalue.com/openapi/v1';

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
        ...(process.env.SOSOVALUE_API_KEY ? { 'x-soso-api-key': process.env.SOSOVALUE_API_KEY } : {}),
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `SoSoValue API returned ${res.status}`, path, detail: detail.slice(0, 200) },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, path }, { status: 500 });
  }
}
