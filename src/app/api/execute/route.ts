import { NextRequest, NextResponse } from "next/server";

const SODEX_BASE = (process.env.SODEX_BASE_URL ?? "https://testnet-gw.sodex.dev/api/v1/spot").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, signature, nonce, params } = body;

  if (!apiKey || !signature || !nonce || !params) {
    return NextResponse.json({ error: "Missing required fields: apiKey, signature, nonce, params" }, { status: 400 });
  }

  try {
    const res = await fetch(`${SODEX_BASE}/trade/orders/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":        "application/json",
        "X-API-Key":     apiKey,
        "X-API-Sign":    signature,
        "X-API-Nonce":   String(nonce),
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || data.code !== 0) {
      return NextResponse.json(
        { error: "SoDEX rejected order", detail: data.message ?? JSON.stringify(data) },
        { status: res.ok ? 422 : res.status }
      );
    }

    return NextResponse.json({ success: true, orders: data.data });
  } catch (err) {
    return NextResponse.json({ error: "SoDEX unreachable", detail: String(err) }, { status: 502 });
  }
}
