'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Wallet } from 'lucide-react';
import { getAuthSession, signInWithEthereum } from '@/lib/auth/client';
import { computeHitRate, type Outcome, type Direction } from '@/lib/scoring';
import { formatAddress } from '@/lib/eip712';

interface CallRow {
  id: string;
  asset: string;
  direction: Direction;
  confidence: number;
  entryPrice: string | null;
  resolutionPrice: string | null;
  resolutionPct: number | null;
  outcome: Outcome | null;
  status: 'open' | 'resolved' | 'disputed';
  publishedAt: string;
}

export default function SignalLedger() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthSession().then(s => {
      setWallet(s.walletAddress);
      if (s.walletAddress) loadCalls(s.walletAddress);
      else setLoading(false);
    });
  }, []);

  const loadCalls = async (author: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calls?author=${author}`);
      const json = await res.json();
      setCalls(json.calls ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      const addr = await signInWithEthereum();
      setWallet(addr);
      await loadCalls(addr);
    } catch (e) {
      alert(String(e));
    }
  };

  const hitRate = computeHitRate(calls.map(c => c.outcome).filter((o): o is Outcome => o !== null));
  const scoredCount = calls.filter(c => c.outcome === 'HIT' || c.outcome === 'MISS').length;

  if (!wallet) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Target size={16} className="text-blue-400" />
          <h2 className="font-semibold text-sm">Signal Accuracy Ledger</h2>
        </div>
        <p className="text-xs text-white/40 mb-3">Sign in with your wallet to see your published calls and track record.</p>
        <button onClick={handleSignIn}
          className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors">
          <Wallet size={12} /> Sign in with Ethereum
        </button>
      </div>
    );
  }

  if (!loading && calls.length === 0) return null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Target size={16} className="text-blue-400" />
          <h2 className="font-semibold text-sm">Signal Accuracy Ledger</h2>
          {hitRate !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              hitRate >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
              hitRate >= 40 ? 'bg-amber-500/20 text-amber-400' :
              'bg-rose-500/20 text-rose-400'
            }`}>
              {hitRate}% accuracy · {scoredCount} scored
            </span>
          )}
        </div>
        <span className="text-xs text-white/30 font-mono">{formatAddress(wallet)}</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}
        </div>
      ) : (
        <>
          {hitRate !== null && (
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
              <span>Status</span>
              <span className="text-right">Entry</span>
              <span className="text-right">Resolution</span>
              <span className="text-right">Outcome</span>
            </div>
            {calls.slice(0, 10).map(c => (
              <CallRowView key={c.id} call={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CallRowView({ call: c }: { call: CallRow }) {
  const SignalIcon = c.direction === 'BULLISH' ? TrendingUp : c.direction === 'BEARISH' ? TrendingDown : Minus;
  const signalColor = c.direction === 'BULLISH' ? 'text-emerald-400' : c.direction === 'BEARISH' ? 'text-rose-400' : 'text-amber-400';

  const outcomeLabel = c.outcome === 'HIT' ? '✓ HIT' : c.outcome === 'MISS' ? '✗ MISS' : c.outcome === 'UNSCORED' ? 'Unscored' : '⏳ Open';
  const outcomeColor = c.outcome === 'HIT' ? 'text-emerald-400' : c.outcome === 'MISS' ? 'text-rose-400' : 'text-white/20';

  return (
    <div className="grid grid-cols-6 text-sm py-2 hover:bg-white/3 rounded px-1 transition-colors items-center">
      <div className="col-span-2 flex items-center gap-1.5">
        <SignalIcon size={12} className={signalColor} />
        <span className={`text-xs font-semibold ${signalColor}`}>{c.direction}</span>
        <span className="text-white/60 truncate">{c.asset}</span>
      </div>
      <span className="text-xs text-white/30 capitalize">{c.status}</span>
      <span className="text-right text-xs text-white/50">
        {c.entryPrice ? `$${parseFloat(c.entryPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
      </span>
      <span className="text-right text-xs text-white/50">
        {c.resolutionPrice ? `$${parseFloat(c.resolutionPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
      </span>
      <span className={`text-right text-xs font-semibold ${outcomeColor}`}>
        {c.resolutionPct !== null
          ? `${c.resolutionPct >= 0 ? '+' : ''}${c.resolutionPct.toFixed(1)}%`
          : outcomeLabel}
      </span>
    </div>
  );
}
