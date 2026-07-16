import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";

export interface SessionData {
  nonce?: string;
  walletAddress?: string;
  isLoggedIn: boolean;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET is not set or too short (needs 32+ chars)");
}

export const sessionOptions = {
  password: sessionSecret,
  cookieName: "soso_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export class UnauthorizedError extends Error {}

// Returns the verified wallet address for the current session, or throws
// UnauthorizedError if there isn't one — callers turn that into a 401.
export async function requireWallet(): Promise<string> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.walletAddress) {
    throw new UnauthorizedError("Not signed in");
  }
  return session.walletAddress;
}
