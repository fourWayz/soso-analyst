import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { connectWallet } from "@/lib/eip712";

export interface AuthSession {
  isLoggedIn: boolean;
  walletAddress: string | null;
}

export async function getAuthSession(): Promise<AuthSession> {
  const res = await fetch("/api/auth/session");
  return res.json();
}

function toHexMessage(message: string): string {
  const bytes = new TextEncoder().encode(message);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getChainId(): Promise<number> {
  const hex = (await window.ethereum!.request({ method: "eth_chainId" })) as string;
  return parseInt(hex, 16);
}

export async function signInWithEthereum(): Promise<string> {
  const account = await connectWallet();
  const checksummedAccount = getAddress(account);

  const nonceRes = await fetch("/api/auth/nonce");
  const { nonce } = await nonceRes.json();

  const siweMessage = new SiweMessage({
    domain: window.location.host,
    address: checksummedAccount,
    statement: "Sign in to SoSo Analyst to publish and follow calls.",
    uri: window.location.origin,
    version: "1",
    chainId: await getChainId(),
    nonce,
  });

  const preparedMessage = siweMessage.prepareMessage();

  const signature = (await window.ethereum!.request({
    method: "personal_sign",
    params: [toHexMessage(preparedMessage), checksummedAccount],
  })) as string;

  const verifyRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: preparedMessage, signature }),
  });

  if (!verifyRes.ok) {
    const { error } = await verifyRes.json();
    throw new Error(error ?? "Sign-in failed");
  }

  const { walletAddress } = await verifyRes.json();
  return walletAddress as string;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
