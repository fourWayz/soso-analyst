'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Trash2, Target } from 'lucide-react';
import { loadSignals, scoreSignal, computeHitRate, clearSignals } from '@/lib/signals';
import type { ScoredSignal } from '@/lib/signals';

// SoDEX symbol → asset symbol mapping for price lookup
const SODEX_TO_ASSET: Record<string, string> = {
  vBTC_vUSDC: 'BTC',
  vETH_vUSDC: 'ETH',
  vSOL_vUSDC: 'SOL',
  vLINK_vUSDC: 'LINK',
};

export default function SignalLedger() {
  const [signals, setSignals] = useState<ScoredSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndScore();
  }, []);

  const loadAndScore = async () => {
    setLoading(true);
    const raw = loadSignals();

    // Find symbols that need price lookup
    const symbolsNeeded = [...new Set(
      raw.filter(s => s.targetSymbol).map(s => s.targetSymbol!)
    )];

    const priceMap: Record<string, number> = {};
    if (symbolsNeeded.length > 0) {
      try {
        const res = await fetch('/api/sodex?path=/markets/tickers');
        const json = await res.json();
        const tickers: { symbol: string; lastPx: string }[] = Array.isArray(json?.data) ? json.data : [];
        for (const t of tickers) {
          priceMap[t.symbol] = parseFloat(t.lastPx);
        }
      } catch {
        // proceed with no prices
      }
    }

    const scored = raw.map(s => {
      const currentPrice = s.targetSymbol ? priceMap[s.targetSymbol] : undefined;
      return scoreSignal(s, currentPrice);
    });

    setSignals(scored);
    setLoading(false);
  };

  const handleClear = () => {
    clearSignals();
    setSignals([]);
  };

  const hitRate = computeHitRate(signals);
  const scoredCount = signals.filter(s => s.outcome === 'HIT' || s.outcome === 'MISS').length;

  if (!loading && signals.length === 0) return null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Target size={16} className="text-blue-400" />
          <h2 className="font-semibold text-sm">Signal Accuracy Ledger</h2>
          {scoredCount > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              hitRate >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
              hitRate >= 40 ? 'bg-amber-500/20 text-amber-400' :
              'bg-rose-500/20 text-rose-400'
            }`}>
              {hitRate}% accuracy · {scoredCount} scored
            </span>
          )}
        </div>
        <button onClick={handleClear}
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Hit rate bar */}
          {scoredCount > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs text-white/30 w-24">Hit rate</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${hitRate >= 60 ? 'bg-emerald-500' : hitRate >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${hitRate}%` }}
                />
              </div>
              <span className="text-xs font-mono text-white/50">{hitRate}%</span>
            </div>
          )}

          <div className="space-y-1">
            <div className="grid grid-cols-6 text-xs text-white/30 pb-2 border-b border-white/5">
              <span className="col-span-2">Signal</span>
              <span>Type</span>
              <span className="text-right">Entry</span>
              <span className="text-right">Current</span>
              <span className="text-right">Outcome</span>
            </div>
            {signals.slice(0, 10).map(s => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SignalRow({ signal: s }: { signal: ScoredSignal }) {
  const SignalIcon = s.signal === 'BULLISH' ? TrendingUp : s.signal === 'BEARISH' ? TrendingDown : Minus;
  const signalColor = s.signal === 'BULLISH' ? 'text-emerald-400' : s.signal === 'BEARISH' ? 'text-rose-400' : 'text-amber-400';

  const outcomeLabel = s.outcome === 'HIT' ? '✓ HIT' : s.outcome === 'MISS' ? '✗ MISS' : '— ';
  const outcomeColor = s.outcome === 'HIT' ? 'text-emerald-400' : s.outcome === 'MISS' ? 'text-rose-400' : 'text-white/20';

  return (
    <div className="grid grid-cols-6 text-sm py-2 hover:bg-white/3 rounded px-1 transition-colors items-center">
      <div className="col-span-2 flex items-center gap-1.5">
        <SignalIcon size={12} className={signalColor} />
        <span className={`text-xs font-semibold ${signalColor}`}>{s.signal}</span>
        <span className="text-white/60 truncate">{s.label}</span>
      </div>
      <span className="text-xs text-white/30 capitalize">{s.type.replace(/_/g, ' ')}</span>
      <span className="text-right text-xs text-white/50">
        {s.priceAtGeneration ? `$${s.priceAtGeneration.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
      </span>
      <span className="text-right text-xs text-white/50">
        {s.currentPrice ? `$${s.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
      </span>
      <span className={`text-right text-xs font-semibold ${outcomeColor}`}>
        {s.priceChangePct !== undefined
          ? `${s.priceChangePct >= 0 ? '+' : ''}${s.priceChangePct.toFixed(1)}%`
          : outcomeLabel}
      </span>
    </div>
  );
}
