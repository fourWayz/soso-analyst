import type { Sector } from "../types";

export const SECTOR_TOKEN_MAP: Record<Sector, string[]> = {
  AI:     ["RENDER", "FET", "AGIX", "TAO", "OCEAN", "NMR"],
  DePIN:  ["IOTX", "HNT", "MOBILE", "HONEY", "NATIX", "ROAM"],
  RWA:    ["ONDO", "MKR", "CFG", "MPL", "PLUME", "TBT"],
  DeFi:   ["UNI", "AAVE", "CRV", "GMX", "DYDX", "SNX"],
  L2:     ["ARB", "OP", "MATIC", "STRK", "MANTA", "SCROLL"],
  L1:     ["ETH", "SOL", "AVAX", "ADA", "SUI", "APT"],
  GameFi: ["AXS", "SAND", "MANA", "IMX", "PIXEL", "RONIN"],
  Meme:   ["DOGE", "SHIB", "PEPE", "WIF", "BONK", "FLOKI"],
  BTC:    ["BTC", "WBTC", "LBTC"],
  ETH:    ["ETH", "STETH", "RETH"],
  SOL:    ["SOL", "JITO", "JUP", "RAY"],
  Other:  [],
};

// Map fundraising project sector names → our Sector enum
export function normalizeSector(raw: string): Sector {
  const map: Record<string, Sector> = {
    "artificial intelligence": "AI",
    "ai": "AI",
    "depin": "DePIN",
    "decentralized physical infrastructure": "DePIN",
    "rwa": "RWA",
    "real world assets": "RWA",
    "defi": "DeFi",
    "decentralized finance": "DeFi",
    "layer 2": "L2",
    "l2": "L2",
    "layer 1": "L1",
    "l1": "L1",
    "gaming": "GameFi",
    "gamefi": "GameFi",
    "meme": "Meme",
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "solana": "SOL",
  };
  return map[raw.toLowerCase()] ?? "Other";
}
