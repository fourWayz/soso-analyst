'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart2, Loader2, RefreshCw, Globe } from 'lucide-react';
import ReportView from '@/components/ReportView';
import type { GeneratedReport, TradeIdea } from '@/lib/claude';

const THEMES = [
  { id: 'AI Tokens', desc: 'AI-driven crypto projects: compute, agents, oracles', categories: ['AI', 'Infrastructure'] },
  { id: 'Real World Assets (RWA)', desc: 'Tokenised bonds, equities, real estate on-chain', categories: ['RWA', 'DeFi'] },
  { id: 'DeFi Renaissance', desc: 'DEX volumes, lending protocols, yield strategies', categories: ['DeFi', 'Yield'] },
  { id: 'Bitcoin Ecosystem', desc: 'BTC ETF flows, L2s, Ordinals, inscriptions', categories: ['Bitcoin', 'L2'] },
  { id: 'Layer 1 Wars', desc: 'Competing L1 blockchains: ETH, SOL, SUI, APT', categories: ['L1', 'Infrastructure'] },
  { id: 'Institutional Adoption', desc: 'ETF inflows, corporate treasuries, regulatory shifts', categories: ['ETF', 'Macro'] },
];

export default function ThemeReportPage() {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [customTheme, setCustomTheme] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const theme = customTheme.trim() || selectedTheme.id;
    const categories = customTheme.trim() ? [] : selectedTheme.categories;

    try {
      setStep('Fetching thematic news from SoSoValue...');
      const [newsRes, etfRes, sectorRes, indicesRes] = await Promise.all([
        fetch('/api/sosovalue?path=/news/featured').then(r => r.json()),
        fetch('/api/sosovalue?path=/etfs/summary-history&symbol=BTC&country_code=US').then(r => r.json()),
        fetch('/api/sosovalue?path=/currencies/sector-spotlight').then(r => r.json()).catch(() => null),
        fetch('/api/sosovalue?path=/indices').then(r => r.json()),
      ]);

      setStep('Generating theme report with Claude AI...');

      const newsArr = Array.isArray(newsRes?.data) ? newsRes.data
        : Array.isArray(newsRes) ? newsRes : [];

      // Filter news by theme categories if applicable
      const filtered = categories.length > 0
        ? newsArr.filter((n: { categories?: string[] }) =>
            categories.some(c => n.categories?.some((nc: string) => nc.toLowerCase().includes(c.toLowerCase()))))
        : newsArr;

      const etfArr = Array.isArray(etfRes?.data) ? etfRes.data : [];
      const latestEtf = etfArr[etfArr.length - 1];

      const sectorData = sectorRes?.data ?? sectorRes;

      const idxArr = Array.isArray(indicesRes?.data) ? indicesRes.data : [];

      const input = {
        type: 'theme_report' as const,
        theme,
        news: (filtered.length >= 3 ? filtered : newsArr).slice(0, 12).map((n: { title: string; summary?: string; source: string; publishTime: number; categories?: string[] }) => ({
          title: n.title,
          summary: n.summary ?? '',
          source: n.source,
          publishTime: n.publishTime,
          categories: n.categories ?? [],
        })),
        etfFlows: latestEtf ? {
          totalNetInflow: latestEtf.total_net_inflow ?? 0,
          btcNetInflow: latestEtf.total_net_inflow,
          date: latestEtf.date ?? new Date().toISOString().split('T')[0],
          trend7d: etfArr.slice(-7).map((e: { total_net_inflow?: number }) => e.total_net_inflow ?? 0),
        } : undefined,
        sectorData: sectorData?.sectors ? {
          sectors: sectorData.sectors.slice(0, 8).map((s: { name: string; change24h?: number; change_pct_24h?: number }) => ({
            name: s.name,
            change24h: s.change24h ?? s.change_pct_24h ?? 0,
          })),
        } : undefined,
        indices: idxArr.slice(0, 4).map((idx: { ticker: string; price?: number; change_pct_24h?: number }) => ({
          ticker: idx.ticker,
          name: idx.ticker,
          value: idx.price ?? 0,
          change24h: (idx.change_pct_24h ?? 0) * 100,
        })),
      };

      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `Failed with status ${res.status}`);
      }

      setReport(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  const handleTrade = (idea: TradeIdea) => {
    window.open(`https://sodex.com/trade/${idea.targetSymbol}`, '_blank');
  };

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
          <span className="text-white/60 text-sm">Theme Report</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50">
          <Link href="/report/daily" className="hover:text-white transition-colors">Daily Brief</Link>
          <Link href="/report/asset" className="hover:text-white transition-colors">Asset Dive</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Globe size={20} className="text-emerald-400" />
            <h1 className="text-2xl font-bold">Theme Report</h1>
          </div>
          <p className="text-white/40 text-sm">
            Narrative-driven research on market themes and sector rotations. Pulls featured news, ETF flows,
            sector data from SoSoValue Terminal and synthesises with Claude AI.
          </p>
        </div>

        {/* Theme selector */}
        <div className="mb-6 p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
          <p className="text-xs text-white/40 mb-3">Select a theme:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {THEMES.map(t => (
              <button key={t.id}
                onClick={() => { setSelectedTheme(t); setCustomTheme(''); }}
                className={`text-left p-3 rounded-lg text-sm transition-colors border ${
                  selectedTheme.id === t.id && !customTheme
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-white'
                    : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white/80'
                }`}>
                <div className="font-medium">{t.id}</div>
                <div className="text-xs text-white/40 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Or enter a custom theme..."
              value={customTheme}
              onChange={e => setCustomTheme(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="mt-3">
            <p className="text-xs text-white/30 mb-1">Data sources:</p>
            <div className="flex flex-wrap gap-1.5">
              {['/news/featured', '/etfs/summary-history', '/currencies/sector-spotlight', '/indices'].map(ep => (
                <span key={ep} className="text-xs font-mono text-emerald-400/70 border border-emerald-400/20 rounded px-2 py-0.5">{ep}</span>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-6 py-3 rounded-lg text-sm font-semibold transition-colors mb-8">
          {loading ? <><Loader2 size={16} className="animate-spin" /> {step}</> : <><RefreshCw size={16} /> Generate: {customTheme || selectedTheme.id}</>}
        </button>

        {error && (
          <div className="p-4 border border-rose-500/30 bg-rose-500/5 rounded-lg mb-6">
            <p className="text-rose-400 text-sm font-semibold mb-1">Error generating report</p>
            <p className="text-white/50 text-xs font-mono">{error}</p>
            <button onClick={generate} className="mt-3 text-xs border border-white/20 px-3 py-1.5 rounded hover:border-white/40 transition-colors">Retry</button>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/60">Theme Report</h2>
              <button onClick={generate} disabled={loading}
                className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded transition-colors">
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
            <ReportView report={report} onTrade={handleTrade} />
          </div>
        )}
      </div>
    </div>
  );
}
