'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart2, TrendingUp, TrendingDown, Minus, Users,
  Wallet, RefreshCw, Filter,
} from 'lucide-react';
import { getAuthSession, signInWithEthereum } from '@/lib/auth/client';
import { formatAddress } from '@/lib/eip712';
import { computeHitRate, type Outcome, type Direction } from '@/lib/scoring';

interface CallRow {
  id: string;
  authorWallet: string;
  asset: string;
  direction: Direction;
  confidence: number;
  thesisText: string;
  entryPrice: string | null;
  resolutionPrice: string | null;
  resolutionPct: number | null;
  outcome: Outcome | null;
  status: 'open' | 'resolved' | 'disputed';
  horizonHours: number;
  publishedAt: string;
}

type FilterMode = 'all' | 'mine' | 'open' | 'resolved';

export default function FeedPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(true);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calls');
      const json = await res.json();
      setCalls(json.calls ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getAuthSession().then(s => setWallet(s.walletAddress));
    loadCalls();
  }, [loadCalls]);

  const handleSignIn = async () => {
    try {
      const addr = await signInWithEthereum();
      setWallet(addr);
    } catch (e) {
      alert(String(e));
    }
  };

  const displayed = calls.filter(c => {
    if (filter === 'mine') return c.authorWallet === wallet;
    if (filter === 'open') return c.status === 'open';
    if (filter === 'resolved') return c.status === 'resolved';
    return true;
  });

  const hitRate = computeHitRate(calls.map(c => c.outcome).filter((o): o is Outcome => o !== null));
  const scoredCount = calls.filter(c => c.outcome === 'HIT' || c.outcome === 'MISS').length;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-mono">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <BarChart2 size={14} />
            </div>
            <span className="font-bold tracking-tight">SoSo Analyst</span>
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white/60 text-sm">Analyst Feed</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50">
          <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/report/daily" className="hover:text-white transition-colors">Daily Brief</Link>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-blue-400" />
            <h1 className="text-2xl font-bold">Analyst Feed</h1>
            {hitRate !== null && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {hitRate}% accuracy across {scoredCount} scored calls
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm">
            EIP-712 signed calls, published on record. Each one resolves automatically against live SoDEX
            prices once its horizon elapses — publish yours from a{' '}
            <Link href="/report/daily" className="text-blue-400 hover:underline">generated report</Link>.
          </p>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-white/30" />
            {(['all', 'mine', 'open', 'resolved'] as FilterMode[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                  filter === f
                    ? 'bg-blue-600/30 border-blue-500/40 text-blue-300'
                    : 'border-white/10 text-white/40 hover:border-white/30'
                }`}>
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {wallet ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {formatAddress(wallet)}
              </span>
            ) : (
              <button onClick={handleSignIn}
                className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors">
                <Wallet size={12} /> Sign in with Ethereum
              </button>
            )}
            <button onClick={loadCalls} disabled={loading}
              className="text-white/30 hover:text-white/60 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Users size={40} className="mx-auto mb-4 opacity-30" />
            <p>{filter === 'mine' ? 'You haven\'t published a call yet.' : 'No calls yet.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(call => (
              <CallCard key={call.id} call={call} isSelf={call.authorWallet === wallet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CallCard({ call, isSelf }: { call: CallRow; isSelf: boolean }) {
  const SignalIcon = call.direction === 'BULLISH' ? TrendingUp : call.direction === 'BEARISH' ? TrendingDown : Minus;
  const sigColor = call.direction === 'BULLISH' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : call.direction === 'BEARISH' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
    : 'text-amber-400 border-amber-500/30 bg-amber-500/10';

  const outcomeColor = call.outcome === 'HIT' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : call.outcome === 'MISS' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    : 'text-white/30 bg-white/5 border-white/10';
  const outcomeLabel = call.outcome === 'HIT' ? '✓ HIT' : call.outcome === 'MISS' ? '✗ MISS'
    : call.outcome === 'UNSCORED' ? 'Unscored' : `⏳ Resolves in ${call.horizonHours}h`;

  const ageHours = (Date.now() - new Date(call.publishedAt).getTime()) / 3_600_000;
  const ageLabel = ageHours < 1 ? 'Just now' : ageHours < 24 ? `${Math.round(ageHours)}h ago` : `${Math.round(ageHours / 24)}d ago`;

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold">
              {call.authorWallet.slice(2, 4).toUpperCase()}
            </div>
            <span className="text-xs text-white/50 font-mono">{formatAddress(call.authorWallet)}</span>
            {isSelf && <span className="text-xs text-blue-400 border border-blue-400/30 rounded px-1">You</span>}
            <span className="text-xs text-white/20">·</span>
            <span className="text-xs text-white/30">{ageLabel}</span>
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${sigColor}`}>
              <SignalIcon size={10} />
              {call.direction}
            </span>
            <span className="text-xs text-white/40">{call.confidence}% confidence · {call.asset}</span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{call.thesisText}</p>

          {call.entryPrice && (
            <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
              <span>Entry: ${parseFloat(call.entryPrice).toLocaleString()}</span>
              {call.resolutionPrice && (
                <span>Resolved: ${parseFloat(call.resolutionPrice).toLocaleString()}</span>
              )}
              {call.resolutionPct !== null && (
                <span className={call.resolutionPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {call.resolutionPct >= 0 ? '+' : ''}{call.resolutionPct.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        <span className={`text-xs font-semibold px-2 py-1 rounded border flex-shrink-0 ${outcomeColor}`}>
          {outcomeLabel}
        </span>
      </div>
    </div>
  );
}
