'use client';

import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';

interface TokenEcon {
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  marketCap?: number;
  fdv?: number;
  holderCount?: number;
  rank?: number;
  // snake_case variants from API
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  market_cap?: number;
  fully_diluted_valuation?: number;
  holder_count?: number;
}

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `${n.toLocaleString()}`;
}

function fmtSupply(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Props {
  assetId: string;
  symbol: string;
}

export default function TokenEconomics({ assetId, symbol }: Props) {
  const [data, setData] = useState<TokenEcon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sosovalue?path=/currencies/${assetId}/token-economics`)
      .then(r => r.json())
      .then(json => {
        const d: TokenEcon = json?.data ?? json;
        if (d && typeof d === 'object') setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading) {
    return (
      <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl mt-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={14} className="text-violet-400" />
          <span className="text-sm font-semibold">Token Economics</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const circulating = data.circulatingSupply ?? data.circulating_supply;
  const total       = data.totalSupply ?? data.total_supply;
  const max         = data.maxSupply ?? data.max_supply;
  const mcap        = data.marketCap ?? data.market_cap;
  const fdv         = data.fdv ?? data.fully_diluted_valuation;
  const holders     = data.holderCount ?? data.holder_count;
  const supplyPct   = circulating && max ? (circulating / max) * 100 : null;

  const cards = [
    { label: 'Circulating Supply', value: circulating ? fmtSupply(circulating) + ' ' + symbol : null },
    { label: 'Total Supply',       value: total ? fmtSupply(total) + ' ' + symbol : null },
    { label: 'Max Supply',         value: max ? fmtSupply(max) + ' ' + symbol : '∞' },
    { label: 'Market Cap',         value: mcap ? fmt(mcap) : null },
    { label: 'Fully Diluted Val.', value: fdv ? fmt(fdv) : null },
    { label: 'Holders',            value: holders ? holders.toLocaleString() : null },
  ].filter(c => c.value !== null);

  if (cards.length === 0) return null;

  return (
    <div className="p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={14} className="text-violet-400" />
        <span className="text-sm font-semibold">Token Economics</span>
        <span className="text-xs text-white/30 ml-auto">/currencies/{assetId}/token-economics</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">{c.label}</div>
            <div className="text-sm font-semibold text-white truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {supplyPct !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Circulating supply</span>
            <span>{supplyPct.toFixed(1)}% of max</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${Math.min(supplyPct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
