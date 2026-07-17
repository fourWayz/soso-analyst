import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// Anchors a day's Merkle root on Arbitrum Sepolia as calldata on a zero-value
// self-transaction — no contract needed, one cheap tx per day regardless of
// call volume. Returns null (rather than throwing) on any failure, since a
// broadcast failure shouldn't block the already-computed, already-stored root.
export async function broadcastAnchor(merkleRoot: Hex): Promise<Hex | null> {
  const privateKey = process.env.ANCHOR_PRIVATE_KEY;
  const rpcUrl = process.env.ANCHOR_RPC_URL;

  if (!privateKey || !rpcUrl) {
    return null;
  }

  try {
    const account = privateKeyToAccount(privateKey as Hex);
    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    });

    return await walletClient.sendTransaction({
      to: account.address,
      value: BigInt(0),
      data: merkleRoot,
    });
  } catch (err) {
    console.error("Anchor broadcast failed:", err);
    return null;
  }
}
