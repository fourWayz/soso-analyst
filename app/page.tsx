'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Newspaper, BarChart2, Zap, ArrowRight, Globe, Shield, Cpu } from 'lucide-react';

interface Ticker {
  symbol: string;
  lastPx: string;
  changePct: number;
}

interface NewsItem {
  id: string;
  title: string;
  content?: string;
  release_time: string;
  categories?: string[];
}

export default function Home() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tickerLoading, setTickerLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sodex?path=/markets/tickers')
      .then(r => r.json())
      .then(d => {
        const items: Ticker[] = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setTickers(items.slice(0, 6));
      })
      .catch(() => setTickers([]))
      .finally(() => setTickerLoading(false));

    fetch('/api/sosovalue?path=/news/hot')
      .then(r => r.json())
      .then(d => {
        const items: NewsItem[] = Array.isArray(d?.data?.list) ? d.data.list
          : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        setNews(items.slice(0, 5));
      })
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white font-mono">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <BarChart2 size={14} />
          </div>
          <span className="font-bold text-lg tracking-tight">SoSo Analyst</span>
          <span className="text-xs text-emerald-400 border border-emerald-400/30 rounded px-1.5 py-0.5 ml-1">WAVE 2</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/60">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/report/daily" className="hover:text-white transition-colors">Daily Brief</Link>
          <Link href="/report/asset" className="hover:text-white transition-colors">Asset Dive</Link>
          <Link href="/report/theme" className="hover:text-white transition-colors">Theme</Link>
          <Link href="/feed" className="hover:text-white transition-colors text-blue-400/80">Analyst Feed</Link>
        </div>
      </nav>

      {/* Live ticker strip */}
      <div className="bg-[#0d1224] border-b border-white/5 px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-8 min-w-max">
          {tickerLoading ? (
            <span className="text-white/30 text-xs animate-pulse">Loading live prices from SoDEX...</span>
          ) : tickers.length === 0 ? (
            <span className="text-white/30 text-xs">● SoDEX live prices · configure API to activate</span>
          ) : (
            tickers.map(t => {
              const pct = t.changePct ?? 0;
              return (
                <span key={t.symbol} className="flex items-center gap-1.5 text-xs">
                  <span className="text-white/50">{t.symbol.replace('_', '/')}</span>
                  <span className="font-semibold">${parseFloat(t.lastPx).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  <span className={pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {pct >= 0 ? <TrendingUp size={10} className="inline" /> : <TrendingDown size={10} className="inline" />}
                    {' '}{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </span>
              );
            })
          )}
          <span className="text-white/20 text-xs ml-4">● LIVE · SoDEX</span>
        </div>
      </div>

      {/* Hero */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          {/* <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6 text-xs text-blue-400"> */}
            {/* <Zap size={12} /> */}
            {/* Powered by SoSoValue Terminal + Claude AI + SoDEX */}
          {/* </div> */}
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Institutional Research.<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              One-Person Operation.
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto mb-10">
            SoSo Analyst turns SoSoValue&apos;s live data — ETF flows, market intelligence, sector data, SSI indices —
            into institutional-quality research reports. Read the analysis. Execute on SoDEX.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/report/daily"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg text-sm font-semibold transition-colors">
              Generate Daily Brief <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard"
              className="flex items-center gap-2 border border-white/20 hover:border-white/40 px-6 py-3 rounded-lg text-sm transition-colors">
              Live Dashboard
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            { icon: Newspaper, title: 'Daily Market Brief', desc: 'Auto-generated from SoSoValue news + ETF flow data. Signal: BULLISH / BEARISH / NEUTRAL with confidence score.', href: '/report/daily', color: 'blue' },
            { icon: BarChart2, title: 'Asset Deep Dive', desc: 'Full research report on any token using live market data, klines, ETF exposure, and sector positioning.', href: '/report/asset', color: 'violet' },
            { icon: Globe, title: 'Theme Reports', desc: 'Narrative-driven research on market themes: AI tokens, RWA, DeFi momentum. Spot the next rotation early.', href: '/report/theme', color: 'emerald' },
          ].map(card => (
            <Link key={card.title} href={card.href}
              className="group bg-white/[0.03] border border-white/[0.08] hover:border-white/20 rounded-xl p-6 transition-all hover:bg-white/5">
              <card.icon size={24} className={`mb-4 ${card.color === 'blue' ? 'text-blue-400' : card.color === 'violet' ? 'text-violet-400' : 'text-emerald-400'}`} />
              <h3 className="font-semibold mb-2">{card.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{card.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-white/30 group-hover:text-white/60 transition-colors">
                Generate report <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>

        {/* Live news from SoSoValue */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold">Live from SoSoValue Terminal</span>
            </div>
            <span className="text-xs text-white/30">Real-time · /news/hot</span>
          </div>
          {newsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : news.length === 0 ? (
            <p className="text-white/30 text-sm">News unavailable — endpoint may be temporarily rate-limited</p>
          ) : (
            <div className="space-y-3">
              {news.map(item => (
                <div key={item.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-white/30">
                        {new Date(parseInt(item.release_time)).toLocaleTimeString()}
                      </span>
                      {item.categories?.slice(0, 2).map(c => (
                        <span key={c} className="text-xs text-blue-400/70 border border-blue-400/20 rounded px-1">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 bg-white/[0.02] px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 text-center">From Data to Trade in One Flow</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: '01', label: 'Ingest', desc: 'SoSoValue pulls live news, ETF flows, market data & SSI indices', icon: Globe },
              { step: '02', label: 'Analyse', desc: 'Claude AI synthesises data into structured research with citations', icon: Cpu },
              { step: '03', label: 'Signal', desc: 'BULLISH / BEARISH / NEUTRAL with confidence score & key risks', icon: Shield },
              { step: '04', label: 'Execute', desc: 'EIP-712 signed order via MetaMask — submitted directly to SoDEX matching engine', icon: Zap },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <s.icon size={20} className="text-blue-400" />
                </div>
                <div className="text-xs text-white/30 mb-1">{s.step}</div>
                <div className="font-semibold mb-2">{s.label}</div>
                <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-white/20">
        <p>SoSo Analyst · Built for SoSoValue Buildathon Wave 1 · Powered by SoSoValue Terminal, SoDEX &amp; Claude AI</p>
        <p className="mt-1">Data sourced from SoSoValue API · Not financial advice · Wave 2</p>
      </footer>
    </main>
  );
}
