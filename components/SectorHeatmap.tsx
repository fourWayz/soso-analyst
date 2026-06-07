'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Sector {
  name: string;
  change24h: number;
}

function heatClass(pct: number): string {
  if (pct > 5)   return 'bg-emerald-500/40 border-emerald-500/40 text-emerald-300';
  if (pct > 2)   return 'bg-emerald-500/25 border-emerald-500/25 text-emerald-400';
  if (pct > 0)   return 'bg-emerald-500/10 border-emerald-500/15 text-emerald-500';
  if (pct > -2)  return 'bg-rose-500/10 border-rose-500/15 text-rose-500';
  if (pct > -5)  return 'bg-rose-500/25 border-rose-500/25 text-rose-400';
  return           'bg-rose-500/40 border-rose-500/40 text-rose-300';
}

export default function SectorHeatmap() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/sosovalue?path=/currencies/sector-spotlight')
      .then(r => r.json())
      .then(json => {
        const raw = json?.data?.sectors ?? json?.data ?? json?.sectors ?? json ?? [];
        const arr: Sector[] = (Array.isArray(raw) ? raw : []).map((s: {
          name?: string;
          sector_name?: string;
          change24h?: number;
          change_pct_24h?: number;
          changePercent?: number;
        }) => ({
          name: s.name ?? s.sector_name ?? '—',
          change24h: s.change24h ?? s.change_pct_24h ?? s.changePercent ?? 0,
        }));
        setSectors(arr.slice(0, 12));
      })
      .catch(() => setSectors([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (!loading && sectors.length === 0) return null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm">Sector Heatmap</h2>
          <p className="text-xs text-white/30 mt-0.5">SoSoValue /currencies/sector-spotlight · 24h change</p>
        </div>
        <button onClick={load} disabled={loading}
          className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-30">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sectors.map(s => (
            <div key={s.name}
              className={`border rounded-lg p-3 text-center transition-all hover:scale-[1.02] ${heatClass(s.change24h)}`}>
              <div className="text-xs font-medium leading-tight truncate mb-1" title={s.name}>{s.name}</div>
              <div className="text-sm font-bold">
                {s.change24h >= 0 ? '+' : ''}{s.change24h.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
