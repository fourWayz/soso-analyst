'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface MarketAlert {
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  headline: string;
  alert: string;
  asset: string;
  targetSymbol: string;
  publishedAt: string;
  generatedAt: string;
}

const CACHE_KEY = 'soso_market_alert_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function loadCached(): MarketAlert | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { alert, ts }: { alert: MarketAlert; ts: number } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return alert;
  } catch {
    return null;
  }
}

function saveCache(alert: MarketAlert) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ alert, ts: Date.now() }));
  } catch {}
}

export default function MarketAlertWidget() {
  const [alert, setAlert] = useState<MarketAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const generate = async (force = false) => {
    setError('');
    if (!force) {
      const cached = loadCached();
      if (cached) { setAlert(cached); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const res = await fetch('/api/alert');
      if (!res.ok) throw new Error(`Alert failed: ${res.status}`);
      const data: MarketAlert = await res.json();
      setAlert(data);
      saveCache(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, []);

  const SignalIcon = alert?.signal === 'BULLISH' ? TrendingUp : alert?.signal === 'BEARISH' ? TrendingDown : Minus;
  const signalBorder = {
    BULLISH: 'border-emerald-500/30',
    BEARISH: 'border-rose-500/30',
    NEUTRAL: 'border-amber-500/30',
  }[alert?.signal ?? 'NEUTRAL'];
  const signalBg = {
    BULLISH: 'bg-emerald-500/5',
    BEARISH: 'bg-rose-500/5',
    NEUTRAL: 'bg-amber-500/5',
  }[alert?.signal ?? 'NEUTRAL'];
  const signalText = {
    BULLISH: 'text-emerald-400',
    BEARISH: 'text-rose-400',
    NEUTRAL: 'text-amber-400',
  }[alert?.signal ?? 'NEUTRAL'];

  return (
    <div className={`border rounded-xl p-5 ${signalBorder} ${signalBg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-blue-400" />
          <span className="text-sm font-semibold">Auto Market Alert</span>
          <span className="text-xs text-white/30">· auto-generated · 30-min cache</span>
        </div>
        <button onClick={() => generate(true)} disabled={loading}
          className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-30">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-4">
          <Loader2 size={18} className="text-blue-400 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm text-white/60">Fetching live data → generating alert...</p>
            <p className="text-xs text-white/30 mt-0.5">SoSoValue news + ETF flows + SoDEX prices → Claude AI</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-xs text-rose-400 py-2">{error}</div>
      ) : alert ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${signalBorder} ${signalText}`}>
              <SignalIcon size={10} />
              {alert.signal}
            </span>
            <span className="text-xs text-white/40">{alert.confidence}% confidence</span>
            <span className="text-xs text-white/20">· {new Date(alert.generatedAt).toLocaleTimeString()}</span>
          </div>
          <p className="text-sm font-semibold text-white mb-1">{alert.headline}</p>
          <p className="text-sm text-white/60 leading-relaxed">{alert.alert}</p>
          <div className="flex items-center gap-3 mt-3">
            <Link href={`/report/asset`}
              className="text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded transition-colors">
              Full Report →
            </Link>
            <span className="text-xs text-white/30">Asset: {alert.asset} · {alert.targetSymbol}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
