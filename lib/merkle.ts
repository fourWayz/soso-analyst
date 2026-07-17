import { keccak256, encodePacked, type Hex } from "viem";

// Standard pairwise Merkle tree (duplicates the last leaf on an odd level).
// Used to anchor a day's call hashes as a single root, so the full log stays
// tamper-evident without writing one transaction per call.
export function computeMerkleRoot(leaves: Hex[]): Hex {
  if (leaves.length === 0) {
    return keccak256("0x");
  }

  let level = [...leaves];
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(keccak256(encodePacked(["bytes32", "bytes32"], [left, right])));
    }
    level = next;
  }
  return level[0];
}
