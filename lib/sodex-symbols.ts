// Shared asset <-> SoDEX market symbol mapping. Assets outside this map can
// still publish calls — they just can't be scored against a live price.
export const ASSET_TO_SODEX_SYMBOL: Record<string, string> = {
  BTC: "vBTC_vUSDC",
  ETH: "vETH_vUSDC",
  SOL: "vSOL_vUSDC",
  LINK: "vLINK_vUSDC",
};

export function sodexSymbolFor(asset: string): string | null {
  return ASSET_TO_SODEX_SYMBOL[asset.toUpperCase()] ?? null;
}
