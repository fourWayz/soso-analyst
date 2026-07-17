import { describe, it, expect } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { CALL_DOMAIN, CALL_TYPES, hashThesis, verifyCallSignature, type CallPayload } from "@/lib/calls-eip712";

async function signPayload(account: ReturnType<typeof privateKeyToAccount>, payload: CallPayload) {
  return account.signTypedData({
    domain: CALL_DOMAIN,
    types: CALL_TYPES,
    primaryType: "Call",
    message: {
      asset: payload.asset,
      direction: payload.direction,
      confidence: BigInt(payload.confidence),
      targetPrice: payload.targetPrice,
      thesisHash: hashThesis(payload.thesisText),
      horizonHours: BigInt(payload.horizonHours),
      publishedAt: BigInt(payload.publishedAt),
    },
  });
}

describe("verifyCallSignature", () => {
  it("recovers the signer address from a valid signature", async () => {
    const account = privateKeyToAccount(generatePrivateKey());

    const payload: CallPayload = {
      asset: "BTC",
      direction: "BULLISH",
      confidence: 75,
      targetPrice: "",
      thesisText: "ETF inflows accelerating, expect continuation.",
      horizonHours: 72,
      publishedAt: Math.floor(Date.now() / 1000),
    };

    const signature = await signPayload(account, payload);
    const recovered = await verifyCallSignature(payload, signature);

    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("recovers a different address when the signed content is tampered with", async () => {
    const account = privateKeyToAccount(generatePrivateKey());

    const payload: CallPayload = {
      asset: "ETH",
      direction: "BEARISH",
      confidence: 60,
      targetPrice: "",
      thesisText: "Staking yield compression reduces demand.",
      horizonHours: 24,
      publishedAt: Math.floor(Date.now() / 1000),
    };

    const signature = await signPayload(account, payload);

    // Changing the thesis text changes its hash, which changes the signed
    // struct — recovery must not still resolve to the original signer.
    const tampered: CallPayload = { ...payload, thesisText: "Completely different thesis." };
    const recovered = await verifyCallSignature(tampered, signature);

    expect(recovered.toLowerCase()).not.toBe(account.address.toLowerCase());
  });

  it("recovers a different address when a different key signed the same payload", async () => {
    const signer = privateKeyToAccount(generatePrivateKey());
    const impostor = privateKeyToAccount(generatePrivateKey());

    const payload: CallPayload = {
      asset: "SOL",
      direction: "BULLISH",
      confidence: 90,
      targetPrice: "180",
      thesisText: "DEX volume breakout above 60-day resistance.",
      horizonHours: 168,
      publishedAt: Math.floor(Date.now() / 1000),
    };

    const signature = await signPayload(signer, payload);
    const recovered = await verifyCallSignature(payload, signature);

    expect(recovered.toLowerCase()).not.toBe(impostor.address.toLowerCase());
    expect(recovered.toLowerCase()).toBe(signer.address.toLowerCase());
  });
});
