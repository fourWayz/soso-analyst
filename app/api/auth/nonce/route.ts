import { NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  const nonce = generateNonce();
  session.nonce = nonce;
  session.isLoggedIn = session.isLoggedIn ?? false;
  await session.save();
  return NextResponse.json({ nonce });
}
