'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart2, TrendingUp, TrendingDown, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

interface Ticker {
  symbol: string;
  lastPx: string;
  highPx: string;
  lowPx: string;
  volume: string;
  changePct: number;
}

interface ETFSummary {
  date: string;
  total_net_assets: number;
  total_net_inflow: number;
  cum_net_inflow?: number;
}

interface NewsItem {
  id: string;
  title: string;
  content?: string;
  release_time: string;
  categories?: string[];
}

interface IndexSnapshot {
  ticker: string;
  price: number;
  change_pct_24h: number;
}

function fmt(n: number, dec = 2) {
  return n.toLocaleString(undefined, { maximumFractionDigits: dec });
}
function fmtM(n: number) {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function Dashboard() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [etf, setEtf] = useState<ETFSummary | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [indices, setIndices] = useState<IndexSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/sodex?path=/markets/tickers').then(r => r.json()),
      fetch('/api/sosovalue?path=/etfs/summary-history&symbol=BTC&country_code=US').then(r => r.json()),
      fetch('/api/sosovalue?path=/news/hot').then(r => r.json()),
      fetch('/api/sosovalue?path=/indices').then(r => r.json()),
    ]).then(async ([tickerData, etfData, newsData, indicesData]) => {
      const tickerArr: Ticker[] = Array.isArray(tickerData?.data) ? tickerData.data : [];
      setTickers(tickerArr.slice(0, 8));

      const etfArr: ETFSummary[] = Array.isArray(etfData?.data) ? etfData.data : [];
      if (etfArr.length > 0) setEtf(etfArr[etfArr.length - 1]);

      const newsArr: NewsItem[] = Array.isArray(newsData?.data?.list) ? newsData.data.list
        : Array.isArray(newsData?.data) ? newsData.data : [];
      setNews(newsArr.slice(0, 8));

      // /indices returns string tickers; fetch snapshots for first 4
      const idxTickers: string[] = Array.isArray(indicesData?.data) ? indicesData.data.slice(0, 4) : [];
      const snapshots = await Promise.all(
        idxTickers.map((t: string) =>
          fetch(`/api/sosovalue?path=/indices/${t}/market-snapshot`)
            .then(r => r.json())
            .then(d => ({ ticker: t, ...(d?.data ?? d) } as IndexSnapshot))
            .catch(() => null)
        )
      );
      setIndices(snapshots.filter(Boolean) as IndexSnapshot[]);

      setLastUpdated(new Date());
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-mono">
      {/* Header */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <BarChart2 size={14} />
            </div>
            <span className="font-bold tracking-tight">SoSo Analyst</span>
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white/60 text-sm">Live Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-white/30">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </nav>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* ETF Flows banner */}
        {etf && (
          <div className="bg-gradient-to-r from-blue-900/30 to-violet-900/20 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-white/40 mb-1">BTC ETF Flows · SoSoValue Terminal · {etf.date}</div>
                <div className="text-2xl font-bold">
                  {etf.total_net_inflow >= 0 ? (
                    <span className="text-emerald-400">+{fmtM(etf.total_net_inflow)}</span>
                  ) : (
                    <span className="text-rose-400">{fmtM(etf.total_net_inflow)}</span>
                  )}
                  <span className="text-white/40 text-sm font-normal ml-2">net inflow</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <div className="text-xs text-white/40">Total Net Assets</div>
                  <div className="font-semibold">{fmtM(etf.total_net_assets)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40">Cumulative Inflow</div>
                  <div className={`font-semibold ${(etf.cum_net_inflow ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmtM(etf.cum_net_inflow ?? 0)}
                  </div>
                </div>
              </div>
              <Link href="/report/daily"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Generate Report <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* SSI Indices */}
        {indices.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {indices.map(idx => (
              <div key={idx.ticker} className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-4">
                <div className="text-xs text-white/40 mb-1">{idx.ticker} · SSI</div>
                <div className="font-bold text-xl">{fmt(idx.price ?? 0)}</div>
                <div className={`text-xs mt-1 ${(idx.change_pct_24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(idx.change_pct_24h ?? 0) >= 0 ? '+' : ''}{((idx.change_pct_24h ?? 0) * 100).toFixed(2)}% 24h
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Tickers */}
          <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">SoDEX Live Markets</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/30">Live</span>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}
              </div>
            ) : tickers.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-white/30">
                <AlertTriangle size={14} /> SoDEX markets unavailable
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-5 text-xs text-white/30 pb-2 border-b border-white/5">
                  <span>Symbol</span><span className="text-right">Price</span>
                  <span className="text-right">24h</span><span className="text-right">High</span>
                  <span className="text-right">Volume</span>
                </div>
                {tickers.map(t => {
                  const pct = t.changePct ?? 0;
                  return (
                    <div key={t.symbol} className="grid grid-cols-5 text-sm py-1.5 hover:bg-white/3 rounded px-1 transition-colors">
                      <span className="text-white/70 font-medium">{t.symbol.replace('_', '/')}</span>
                      <span className="text-right font-semibold">${fmt(parseFloat(t.lastPx), 4)}</span>
                      <span className={`text-right ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pct >= 0 ? <TrendingUp size={10} className="inline mr-0.5" /> : <TrendingDown size={10} className="inline mr-0.5" />}
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                      <span className="text-right text-white/50">${fmt(parseFloat(t.highPx), 4)}</span>
                      <span className="text-right text-white/50">{fmt(parseFloat(t.volume), 0)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Generate */}
          <div className="space-y-3">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4">Generate Research</h2>
              <div className="space-y-3">
                {[
                  { href: '/report/daily', label: 'Daily Market Brief', desc: 'Full market overview', color: 'blue' },
                  { href: '/report/asset', label: 'Asset Deep Dive', desc: 'Single token analysis', color: 'violet' },
                  { href: '/report/theme', label: 'Theme Report', desc: 'Narrative & sector view', color: 'emerald' },
                ].map(r => (
                  <Link key={r.label} href={r.href}
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/8 border border-white/[0.06] rounded-lg transition-all group">
                    <div>
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-white/40">{r.desc}</div>
                    </div>
                    <ArrowRight size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Data sources badge */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
              <div className="text-xs text-white/40 mb-3">Powered by</div>
              <div className="space-y-2">
                {['SoSoValue Terminal API', 'SoDEX Spot Markets', 'SSI Index Protocol', 'Claude AI (Sonnet)'].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-white/60">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* News feed */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">SoSoValue News Feed</h2>
            <span className="text-xs text-white/30">/news · Real-time</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}
            </div>
          ) : news.length === 0 ? (
            <p className="text-white/30 text-sm">Configure SOSOVALUE_API_KEY to see live news</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {news.map(item => (
                <div key={item.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                  <p className="text-sm text-white/80 leading-snug mb-1">{item.title}</p>
                  {item.content && <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{item.content}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-white/30">
                      {new Date(parseInt(item.release_time)).toLocaleTimeString()}
                    </span>
                    {item.categories?.slice(0, 2).map(c => (
                      <span key={c} className="text-xs text-blue-400/70 border border-blue-400/20 rounded px-1">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
