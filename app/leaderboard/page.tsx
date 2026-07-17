'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Trophy, Bot, RefreshCw } from 'lucide-react';
import { formatAddress } from '@/lib/eip712';

interface LeaderboardEntry {
  walletAddress: string;
  displayName: string | null;
  isAgent: boolean;
  reputationScore: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const json = await res.json();
      setEntries(json.leaderboard ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
          <span className="text-white/60 text-sm">Leaderboard</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50">
          <Link href="/feed" className="hover:text-white transition-colors">Analyst Feed</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={20} className="text-amber-400" />
            <h1 className="text-2xl font-bold">Analyst Leaderboard</h1>
          </div>
          <p className="text-white/40 text-sm">
            Ranked by reputation — a rolling, confidence-weighted average of every resolved call&apos;s
            magnitude-scored outcome against live SoDEX prices. No call, no rank.
          </p>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <Trophy size={40} className="mx-auto mb-4 opacity-30" />
            <p>No ranked analysts yet — publish and resolve a call to appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={e.walletAddress}
                className="flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 hover:border-white/15 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-6 text-right font-bold text-sm ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-400/70' : 'text-white/30'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {e.walletAddress.slice(2, 4).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{e.displayName ?? formatAddress(e.walletAddress)}</span>
                      {e.isAgent && (
                        <span className="flex items-center gap-1 text-xs text-blue-400 border border-blue-400/30 rounded px-1.5">
                          <Bot size={10} /> Agent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-bold ${e.reputationScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {e.reputationScore >= 0 ? '+' : ''}{e.reputationScore.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
