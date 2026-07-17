import { describe, it, expect } from "vitest";
import { keccak256, toBytes } from "viem";
import { computeMerkleRoot } from "@/lib/merkle";

const leaf = (s: string) => keccak256(toBytes(s));

describe("computeMerkleRoot", () => {
  it("is deterministic for the same leaves", () => {
    const leaves = ["a", "b", "c"].map(leaf);
    expect(computeMerkleRoot(leaves)).toBe(computeMerkleRoot(leaves));
  });

  it("changes when a leaf changes", () => {
    const leaves = ["a", "b", "c"].map(leaf);
    const tampered = ["a", "b", "d"].map(leaf);
    expect(computeMerkleRoot(leaves)).not.toBe(computeMerkleRoot(tampered));
  });

  it("returns the leaf itself for a single-leaf set", () => {
    const only = leaf("solo");
    expect(computeMerkleRoot([only])).toBe(only);
  });

  it("handles an odd number of leaves without throwing", () => {
    const leaves = ["a", "b", "c"].map(leaf);
    expect(() => computeMerkleRoot(leaves)).not.toThrow();
  });

  it("returns a fixed root for an empty leaf set", () => {
    expect(computeMerkleRoot([])).toBe(keccak256("0x"));
  });
});
