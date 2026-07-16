import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const { message, signature } = await req.json();

  if (!message || !signature) {
    return NextResponse.json({ error: "message and signature are required" }, { status: 400 });
  }

  if (!session.nonce) {
    return NextResponse.json({ error: "No nonce in session — request one first" }, { status: 401 });
  }

  const siweMessage = new SiweMessage(message);
  const host = req.headers.get("host") ?? undefined;

  let result;
  try {
    result = await siweMessage.verify({ signature, nonce: session.nonce, domain: host });
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  if (!result.success) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const walletAddress = result.data.address.toLowerCase();

  session.walletAddress = walletAddress;
  session.isLoggedIn = true;
  session.nonce = undefined;
  await session.save();

  await db.insert(users).values({ walletAddress }).onConflictDoNothing({ target: users.walletAddress });

  return NextResponse.json({ ok: true, walletAddress });
}
