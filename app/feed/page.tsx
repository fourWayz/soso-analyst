'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2, TrendingUp, TrendingDown, Minus, Users,
  UserPlus, UserMinus, Wallet, Loader2, RefreshCw, Filter,
} from 'lucide-react';
import { loadFeed, publishEntry, loadFollowing, toggleFollow, scoreEntry72h } from '@/lib/feed';
import type { FeedEntry } from '@/lib/feed';
import { connectWallet, getConnectedAccount, formatAddress } from '@/lib/eip712';

type FilterMode = 'all' | 'following' | 'asset' | 'theme';

export default function FeedPage() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterMode>('all');
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    getConnectedAccount().then(setAccount);
    const f = loadFollowing();
    setFollowing(f);
    loadAndScore();
  }, []);

  const loadAndScore = async () => {
    setLoading(true);
    const raw = loadFeed();
    // Score entries older than 72h against live klines
    const scored = await Promise.all(raw.map(e => scoreEntry72h(e)));
    setEntries(scored);
    setLoading(false);
  };

  const handleConnect = async () => {
    try {
      const addr = await connectWallet();
      setAccount(addr);
    } catch (e) {
      alert(String(e));
    }
  };

  const handleFollow = (address: string) => {
    const isNow = toggleFollow(address);
    setFollowing(prev => {
      const next = new Set(prev);
      isNow ? next.add(address) : next.delete(address);
      return next;
    });
  };

  // Demo publish — publishes the most recent signal from localStorage as a feed entry
  const handlePublish = async () => {
    if (!account) return;
    setPublishing(true);
    try {
      const stored = JSON.parse(localStorage.getItem('soso_signals_v2') ?? '[]');
      const latest = stored[0];
      if (!latest) { alert('Generate a report first, then publish it to the feed.'); return; }
      publishEntry({
        analystAddress: account,
        type: latest.type,
        label: latest.label,
        signal: latest.signal,
        confidence: latest.confidence,
        title: `${latest.signal} signal on ${latest.label} — by ${formatAddress(account)}`,
        executiveSummary: `${latest.signal} signal with ${latest.confidence}% confidence on ${latest.label}. Published from SoSo Analyst.`,
        priceAtPublish: latest.priceAtGeneration,
        symbol: latest.symbol,
        targetSymbol: latest.targetSymbol,
        publishedAt: new Date().toISOString(),
      });
      await loadAndScore();
    } finally {
      setPublishing(false);
    }
  };

  const displayed = entries.filter(e => {
    if (filter === 'following') return following.has(e.analystAddress);
    if (filter === 'asset') return e.type === 'asset_deep_dive';
    if (filter === 'theme') return e.type === 'theme_report';
    return true;
  });

  const hitCount = entries.filter(e => e.outcome === 'HIT').length;
  const missCount = entries.filter(e => e.outcome === 'MISS').length;
  const accuracy = hitCount + missCount > 0 ? Math.round((hitCount / (hitCount + missCount)) * 100) : null;

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
            {accuracy !== null && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {accuracy}% 72h accuracy across {hitCount + missCount} scored calls
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm">
            Published research signals from on-chain analysts. Signals are scored against SoDEX klines after 72 hours.
          </p>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-white/30" />
            {(['all', 'following', 'asset', 'theme'] as FilterMode[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                  filter === f
                    ? 'bg-blue-600/30 border-blue-500/40 text-blue-300'
                    : 'border-white/10 text-white/40 hover:border-white/30'
                }`}>
                {f === 'following' ? `Following (${following.size})` : f}
              </button>
            ))}
          </div>

          {/* Wallet + publish */}
          <div className="flex items-center gap-2">
            {account ? (
              <>
                <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {formatAddress(account)}
                </span>
                <button onClick={handlePublish} disabled={publishing}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
                  {publishing ? <Loader2 size={12} className="animate-spin" /> : null}
                  Publish Latest Signal
                </button>
              </>
            ) : (
              <button onClick={handleConnect}
                className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors">
                <Wallet size={12} /> Connect to Publish
              </button>
            )}
            <button onClick={loadAndScore} disabled={loading}
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
            <p>{filter === 'following' ? 'Follow an analyst to see their signals here.' : 'No signals yet.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(entry => (
              <FeedCard
                key={entry.id}
                entry={entry}
                isFollowing={following.has(entry.analystAddress)}
                isSelf={entry.analystAddress === account}
                onFollow={() => handleFollow(entry.analystAddress)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedCard({
  entry, isFollowing, isSelf, onFollow,
}: {
  entry: FeedEntry;
  isFollowing: boolean;
  isSelf: boolean;
  onFollow: () => void;
}) {
  const SignalIcon = entry.signal === 'BULLISH' ? TrendingUp : entry.signal === 'BEARISH' ? TrendingDown : Minus;
  const sigColor = entry.signal === 'BULLISH' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : entry.signal === 'BEARISH' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
    : 'text-amber-400 border-amber-500/30 bg-amber-500/10';

  const outcomeColor = entry.outcome === 'HIT' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : entry.outcome === 'MISS' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    : 'text-white/30 bg-white/5 border-white/10';
  const outcomeLabel = entry.outcome === 'HIT' ? '✓ HIT' : entry.outcome === 'MISS' ? '✗ MISS' : '⏳ Pending 72h';

  const ageHours = (Date.now() - new Date(entry.publishedAt).getTime()) / 3_600_000;
  const ageLabel = ageHours < 1 ? 'Just now' : ageHours < 24 ? `${Math.round(ageHours)}h ago` : `${Math.round(ageHours / 24)}d ago`;

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {/* Analyst + meta */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold">
              {entry.analystAddress.slice(2, 4).toUpperCase()}
            </div>
            <span className="text-xs text-white/50 font-mono">{entry.analystAddress}</span>
            {isSelf && <span className="text-xs text-blue-400 border border-blue-400/30 rounded px-1">You</span>}
            <span className="text-xs text-white/20">·</span>
            <span className="text-xs text-white/30">{ageLabel}</span>
            <span className="text-xs text-white/20">·</span>
            <span className="text-xs text-white/30 capitalize">{entry.type.replace(/_/g, ' ')}</span>
          </div>

          {/* Signal + title */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${sigColor}`}>
              <SignalIcon size={10} />
              {entry.signal}
            </span>
            <span className="text-xs text-white/40">{entry.confidence}% confidence · {entry.label}</span>
          </div>
          <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{entry.title}</h3>
          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{entry.executiveSummary}</p>

          {/* Price data */}
          {entry.priceAtPublish && (
            <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
              <span>Entry: ${entry.priceAtPublish.toLocaleString()}</span>
              {entry.priceAt72h && (
                <span>72h: ${entry.priceAt72h.toLocaleString()}</span>
              )}
              {entry.priceChangePct !== undefined && (
                <span className={entry.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {entry.priceChangePct >= 0 ? '+' : ''}{entry.priceChangePct.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded border ${outcomeColor}`}>
            {outcomeLabel}
          </span>
          {!isSelf && (
            <button onClick={onFollow}
              className="flex items-center gap-1 text-xs border border-white/20 hover:border-white/40 px-2 py-1 rounded transition-colors">
              {isFollowing
                ? <><UserMinus size={11} /> Unfollow</>
                : <><UserPlus size={11} /> Follow</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
