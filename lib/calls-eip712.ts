import { keccak256, recoverTypedDataAddress, toBytes, type Hex } from "viem";

export const CALL_DOMAIN = {
  name: "SoSo Analyst",
  version: "1",
} as const;

export const CALL_TYPES = {
  Call: [
    { name: "asset", type: "string" },
    { name: "direction", type: "string" },
    { name: "confidence", type: "uint256" },
    { name: "targetPrice", type: "string" },
    { name: "thesisHash", type: "bytes32" },
    { name: "horizonHours", type: "uint256" },
    { name: "publishedAt", type: "uint256" },
  ],
} as const;

export interface CallPayload {
  asset: string;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  targetPrice: string; // "" if none — EIP-712 has no concept of optional fields
  thesisText: string;
  horizonHours: number;
  publishedAt: number; // unix seconds
}

export function hashThesis(thesisText: string): Hex {
  return keccak256(toBytes(thesisText));
}

// eth_signTypedData_v4 (client, via window.ethereum) accepts plain numbers
// for uint256 fields in its JSON payload.
function buildMessageForSigning(payload: CallPayload) {
  return {
    asset: payload.asset,
    direction: payload.direction,
    confidence: payload.confidence,
    targetPrice: payload.targetPrice,
    thesisHash: hashThesis(payload.thesisText),
    horizonHours: payload.horizonHours,
    publishedAt: payload.publishedAt,
  };
}

// viem's typed-data recovery is strictly typed against the Solidity type —
// uint256 must be bigint. Same struct hash as the signing side above as long
// as the underlying values match.
function buildMessageForVerification(payload: CallPayload) {
  return {
    asset: payload.asset,
    direction: payload.direction,
    confidence: BigInt(payload.confidence),
    targetPrice: payload.targetPrice,
    thesisHash: hashThesis(payload.thesisText),
    horizonHours: BigInt(payload.horizonHours),
    publishedAt: BigInt(payload.publishedAt),
  };
}

// Client-side: signs a call payload with the connected wallet via MetaMask's
// raw JSON-RPC (matches this project's existing eip712.ts convention rather
// than pulling in a full viem WalletClient).
export async function signCall(account: string, payload: CallPayload): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const typedData = JSON.stringify({
    domain: CALL_DOMAIN,
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
      ],
      ...CALL_TYPES,
    },
    primaryType: "Call",
    message: buildMessageForSigning(payload),
  });

  return (await window.ethereum.request({
    method: "eth_signTypedData_v4",
    params: [account, typedData],
  })) as string;
}

// Server-side: recovers the signer address from a call payload + signature.
// Caller is responsible for comparing the result against the expected wallet.
export async function verifyCallSignature(payload: CallPayload, signature: Hex): Promise<Hex> {
  return recoverTypedDataAddress({
    domain: CALL_DOMAIN,
    types: CALL_TYPES,
    primaryType: "Call",
    message: buildMessageForVerification(payload),
    signature,
  });
}
