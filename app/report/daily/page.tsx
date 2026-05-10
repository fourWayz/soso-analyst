'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart2, Loader2, RefreshCw, Newspaper } from 'lucide-react';
import ReportView from '@/components/ReportView';
import type { GeneratedReport, TradeIdea } from '@/lib/claude';

export default function DailyBriefPage() {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      setStep('Fetching news from SoSoValue...');
      const [newsRes, etfRes, indicesRes, macroRes] = await Promise.all([
        fetch('/api/sosovalue?path=/news/hot').then(r => r.json()),
        fetch('/api/sosovalue?path=/etfs/summary-history&symbol=BTC&country_code=US').then(r => r.json()),
        fetch('/api/sosovalue?path=/indices').then(r => r.json()),
        fetch(`/api/sosovalue?path=/macro/events&date=${new Date().toISOString().split('T')[0]}`).then(r => r.json()),
      ]);

      setStep('Fetching ETF flows & market data...');
      const newsArr = Array.isArray(newsRes?.data?.list) ? newsRes.data.list
        : Array.isArray(newsRes?.data) ? newsRes.data
        : Array.isArray(newsRes) ? newsRes : [];

      const etfArr = Array.isArray(etfRes?.data) ? etfRes.data
        : Array.isArray(etfRes) ? etfRes : [];
      const latestEtf = etfArr[etfArr.length - 1];

      const idxTickers: string[] = Array.isArray(indicesRes?.data) ? indicesRes.data.slice(0, 4) : [];
      const idxSnapshots = await Promise.all(
        idxTickers.map((t: string) =>
          fetch(`/api/sosovalue?path=/indices/${t}/market-snapshot`)
            .then(r => r.json())
            .then(d => ({ ticker: t, ...(d?.data ?? d) }))
            .catch(() => null)
        )
      );
      const idxArr = idxSnapshots.filter(Boolean);

      const macroArr = Array.isArray(macroRes?.data) ? macroRes.data
        : Array.isArray(macroRes) ? macroRes : [];

      setStep('Generating report with Claude AI...');

      const etf7d: number[] = etfArr.slice(-7).map((e: { total_net_inflow?: number }) => e.total_net_inflow ?? 0);

      const input = {
        type: 'daily_brief' as const,
        news: newsArr.slice(0, 12).map((n: { title: string; content?: string; release_time?: string; categories?: string[] }) => ({
          title: n.title,
          summary: n.content ?? '',
          source: 'SoSoValue',
          publishTime: parseInt(n.release_time ?? '0'),
          categories: n.categories ?? [],
        })),
        etfFlows: latestEtf ? {
          totalNetInflow: latestEtf.total_net_inflow ?? 0,
          btcNetInflow: latestEtf.total_net_inflow,
          date: latestEtf.date ?? new Date().toISOString().split('T')[0],
          trend7d: etf7d,
        } : undefined,
        indices: idxArr.slice(0, 4).map((idx: { ticker: string; price?: number; change_pct_24h?: number }) => ({
          ticker: idx.ticker,
          name: idx.ticker,
          value: idx.price ?? 0,
          change24h: (idx.change_pct_24h ?? 0) * 100,
        })),
        macroEvents: macroArr.slice(0, 5).map((e: { event: string; date: string; impact: string; actual?: string; forecast?: string }) => ({
          event: e.event,
          date: e.date,
          impact: e.impact,
          actual: e.actual,
          forecast: e.forecast,
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

      const data = await res.json();
      setReport(data);
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
          <span className="text-white/60 text-sm">Daily Market Brief</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50">
          <Link href="/report/asset" className="hover:text-white transition-colors">Asset Dive</Link>
          <Link href="/report/theme" className="hover:text-white transition-colors">Theme</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Newspaper size={20} className="text-blue-400" />
            <h1 className="text-2xl font-bold">Daily Market Brief</h1>
          </div>
          <p className="text-white/40 text-sm">
            AI-generated market overview using live SoSoValue data: hot news, ETF flows, SSI indices & macro events.
            Produces a BULLISH / BEARISH / NEUTRAL signal with confidence score and SoDEX trade idea.
          </p>
        </div>

        {/* Data sources used */}
        <div className="mb-6 p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
          <p className="text-xs text-white/30 mb-2">Data sources pulled for this report:</p>
          <div className="flex flex-wrap gap-2">
            {['/news/hot', '/etfs/summary-history', '/indices', '/macro/events'].map(ep => (
              <span key={ep} className="text-xs font-mono text-blue-400/70 border border-blue-400/20 rounded px-2 py-0.5">
                SoSoValue {ep}
              </span>
            ))}
          </div>
        </div>

        {!report && !loading && (
          <div className="text-center py-16">
            <Newspaper size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/30 mb-6">Click below to pull live data and generate today&apos;s brief</p>
            <button onClick={generate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg text-sm font-semibold transition-colors mx-auto">
              <RefreshCw size={16} /> Generate Daily Brief
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <Loader2 size={36} className="text-blue-400 mx-auto mb-4 animate-spin" />
            <p className="text-white/60 text-sm">{step}</p>
            <p className="text-white/30 text-xs mt-2">Fetching SoSoValue data → synthesising with Claude AI...</p>
          </div>
        )}

        {error && (
          <div className="p-4 border border-rose-500/30 bg-rose-500/5 rounded-lg mb-6">
            <p className="text-rose-400 text-sm font-semibold mb-1">Error generating report</p>
            <p className="text-white/50 text-xs font-mono">{error}</p>
            <button onClick={generate} className="mt-3 text-xs border border-white/20 px-3 py-1.5 rounded hover:border-white/40 transition-colors">
              Retry
            </button>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/60">Generated Report</h2>
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
