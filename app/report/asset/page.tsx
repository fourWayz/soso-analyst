'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart2, Loader2, RefreshCw, Search } from 'lucide-react';
import ReportView from '@/components/ReportView';
import TokenEconomics from '@/components/TokenEconomics';
import type { GeneratedReport, TradeIdea } from '@/lib/claude';

const PRESET_ASSETS = [
  { id: 'bitcoin', symbol: 'BTC', sodexSymbol: 'vBTC_vUSDC' },
  { id: 'ethereum', symbol: 'ETH', sodexSymbol: 'vETH_vUSDC' },
  { id: 'solana', symbol: 'SOL', sodexSymbol: 'vSOL_vUSDC' },
  { id: 'chainlink', symbol: 'LINK', sodexSymbol: 'vLINK_vUSDC' },
];

export default function AssetDivePage() {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(PRESET_ASSETS[0]);
  const [customId, setCustomId] = useState('');

  const generate = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const assetId = customId.trim() || selectedAsset.id;
    const assetSymbol = customId.trim().toUpperCase() || selectedAsset.symbol;

    try {
      setStep(`Fetching ${assetSymbol} market data from SoSoValue...`);
      const [newsRes, snapshotRes, etfRes, klineRes] = await Promise.all([
        fetch(`/api/sosovalue?path=/news&category=${assetSymbol}`).then(r => r.json()),
        fetch(`/api/sosovalue?path=/currencies/${assetId}/market-snapshot`).then(r => r.json()).catch(() => null),
        fetch('/api/sosovalue?path=/etfs/summary-history&symbol=BTC&country_code=US').then(r => r.json()),
        fetch(`/api/sosovalue?path=/currencies/${assetId}/klines&interval=1d&limit=30`).then(r => r.json()).catch(() => null),
      ]);

      setStep('Synthesising research with Claude AI...');

      const newsArr = Array.isArray(newsRes?.data?.list) ? newsRes.data.list
        : Array.isArray(newsRes?.data) ? newsRes.data
        : Array.isArray(newsRes) ? newsRes : [];

      const snapshot = snapshotRes?.data ?? snapshotRes;
      const etfArr = Array.isArray(etfRes?.data) ? etfRes.data : [];
      const latestEtf = etfArr[etfArr.length - 1];

      const input = {
        type: 'asset_deep_dive' as const,
        asset: assetSymbol,
        news: newsArr.slice(0, 12).map((n: { title: string; summary?: string; source: string; publishTime: number; categories?: string[] }) => ({
          title: n.title,
          summary: n.summary ?? '',
          source: n.source,
          publishTime: n.publishTime,
          categories: n.categories ?? [],
        })),
        marketData: snapshot ? {
          symbol: assetSymbol,
          price: snapshot.price ?? 0,
          change24h: snapshot.change24h ?? 0,
          change7d: snapshot.change7d,
          marketCap: snapshot.marketCap ?? 0,
          volume24h: snapshot.volume24h ?? 0,
        } : undefined,
        etfFlows: latestEtf ? {
          totalNetInflow: latestEtf.total_net_inflow ?? 0,
          btcNetInflow: latestEtf.total_net_inflow,
          date: latestEtf.date ?? new Date().toISOString().split('T')[0],
          trend7d: etfArr.slice(-7).map((e: { total_net_inflow?: number }) => e.total_net_inflow ?? 0),
        } : undefined,
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

      const generated: GeneratedReport = await res.json();
      setReport(generated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTrade = (_idea: TradeIdea) => {
    // EIP-712 trade gate handles execution inside ReportView
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
          <span className="text-white/60 text-sm">Asset Deep Dive</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50">
          <Link href="/report/daily" className="hover:text-white transition-colors">Daily Brief</Link>
          <Link href="/report/theme" className="hover:text-white transition-colors">Theme</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Search size={20} className="text-violet-400" />
            <h1 className="text-2xl font-bold">Asset Deep Dive</h1>
          </div>
          <p className="text-white/40 text-sm">
            Full institutional research report on any crypto asset. Pulls market snapshot, news, ETF exposure and
            kline data from SoSoValue Terminal, then synthesises with Claude AI.
          </p>
        </div>

        {/* Asset selector */}
        <div className="mb-6 p-5 bg-white/[0.02] border border-white/[0.08] rounded-xl">
          <p className="text-xs text-white/40 mb-3">Select asset or enter SoSoValue currency ID:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_ASSETS.map(a => (
              <button key={a.id}
                onClick={() => { setSelectedAsset(a); setCustomId(''); }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                  selectedAsset.id === a.id && !customId
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-white/20 text-white/60 hover:border-white/40'
                }`}>
                {a.symbol}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Or enter SoSoValue ID (e.g. avalanche-2)"
              value={customId}
              onChange={e => setCustomId(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="mt-3">
            <p className="text-xs text-white/30 mb-1">Data sources for this report:</p>
            <div className="flex flex-wrap gap-1.5">
              {['/currencies/{id}/market-snapshot', '/news?category={symbol}', '/currencies/{id}/klines', '/etfs/summary-history', '/currencies/{id}/token-economics'].map(ep => (
                <span key={ep} className="text-xs font-mono text-violet-400/70 border border-violet-400/20 rounded px-2 py-0.5">{ep}</span>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-6 py-3 rounded-lg text-sm font-semibold transition-colors mb-8">
          {loading ? <><Loader2 size={16} className="animate-spin" /> {step}</> : <><RefreshCw size={16} /> Generate Deep Dive: {customId || selectedAsset.symbol}</>}
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
              <h2 className="text-sm font-semibold text-white/60">Research Report</h2>
              <button onClick={generate} disabled={loading}
                className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded transition-colors">
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
            <TokenEconomics assetId={customId || selectedAsset.id} symbol={customId.toUpperCase() || selectedAsset.symbol} />
            <ReportView report={report} onTrade={handleTrade} />
          </div>
        )}
      </div>
    </div>
  );
}
