"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Zap, TrendingUp, Activity, BarChart2 } from "lucide-react";
import ConvictionCell from "@/components/ConvictionCell";
import SignalDetail from "@/components/SignalDetail";
import ExecutionModal from "@/components/ExecutionModal";
import NewsFeed from "@/components/NewsFeed";
import MarketTicker from "@/components/MarketTicker";
import WalletButton from "@/components/WalletButton";
import ConvictionAlerts from "@/components/ConvictionAlerts";
import type { ConvictionSignal } from "@/lib/types";

export default function Home() {
  const [signals, setSignals]         = useState<ConvictionSignal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [selected, setSelected]       = useState<ConvictionSignal | null>(null);
  const [executing, setExecuting]     = useState<ConvictionSignal | null>(null);
  const [error, setError]             = useState("");
  const [dataSource, setDataSource]   = useState<"live" | "mock" | null>(null);
  const [aiActive, setAiActive]       = useState(false);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/conviction");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSignals(data.signals ?? []);
      setDataSource(data.source ?? null);
      setAiActive(data.aiNarratives ?? false);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(fetchSignals, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(id);
  }, [fetchSignals]);

  const sorted = [...signals].sort((a, b) => b.overallScore - a.overallScore);
  const topSignals = sorted.filter(s => s.direction === "STRONG_BUY" || s.direction === "BUY");
  const avgScore   = signals.length ? Math.round(signals.reduce((s, x) => s + x.overallScore, 0) / signals.length) : 0;

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      {/* Ticker strip */}
      <MarketTicker />

      {/* Top nav */}
      <header className="border-b border-terminal-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-terminal-bright tracking-tight">
              ◈ CONVICTION MATRIX
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-terminal-text">
                Stop trading news. Start trading conviction.
              </p>
              {dataSource && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  dataSource === "live"
                    ? "text-signal-strong bg-signal-strong/10"
                    : "text-signal-neutral bg-signal-neutral/10"
                }`}>
                  {dataSource === "live" ? "● LIVE DATA" : "● MOCK DATA"}
                </span>
              )}
              {aiActive && (
                <span className="text-xs font-bold px-2 py-0.5 rounded text-signal-mild bg-signal-mild/10">
                  ◈ AI ON
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lastUpdated && (
              <span className="text-xs text-terminal-text hidden sm:block">
                Updated {lastUpdated}
              </span>
            )}
            <ConvictionAlerts signals={signals} />
            <Link
              href="/backtest"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-terminal-border rounded text-xs text-terminal-text hover:text-terminal-bright hover:border-terminal-bright transition-colors"
            >
              <BarChart2 size={12} />
              Backtest
            </Link>
            <WalletButton />
            <button
              onClick={fetchSignals}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 border border-terminal-border rounded text-xs text-terminal-text hover:text-terminal-bright hover:border-terminal-bright transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Scanning..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Activity size={14} />} label="Market Avg Conviction" value={`${avgScore}/100`} />
          <StatCard icon={<TrendingUp size={14} />} label="BUY Signals" value={`${topSignals.length} sectors`} color="text-signal-strong" />
          <StatCard icon={<Zap size={14} />} label="Data Sources" value="9 API modules" />
          <StatCard icon={<RefreshCw size={14} />} label="Engine Layers" value="3-Layer Convergence" />
        </div>

        {error && (
          <div className="border border-signal-none/40 bg-signal-none/10 rounded-lg p-4 text-sm text-signal-none">
            Engine error: {error}
          </div>
        )}

        {/* How it works — compact legend */}
        <div className="border border-terminal-border rounded-lg px-4 py-3 bg-terminal-surface text-xs text-terminal-text flex flex-wrap gap-4">
          <span className="font-bold text-terminal-bright">HOW IT WORKS:</span>
          <span>Layer 1 (30%) — <span className="text-terminal-bright">Fundraising velocity</span></span>
          <span>Layer 2 (35%) — <span className="text-terminal-bright">BTC treasuries + crypto stock momentum</span></span>
          <span>Layer 3 (35%) — <span className="text-terminal-bright">ETF flows + macro event history</span></span>
          <span className="text-signal-strong">≥75 = STRONG BUY</span>
          <span className="text-signal-mild">60–74 = BUY</span>
          <span className="text-signal-neutral">40–59 = NEUTRAL</span>
          <span className="text-signal-none">≤39 = SELL</span>
        </div>

        {loading && signals.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 bg-terminal-surface border border-terminal-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Matrix grid */}
            <div className="lg:col-span-2 space-y-4">
              <p className="text-xs font-bold text-terminal-text tracking-widest">SECTOR CONVICTION MATRIX</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {sorted.map(signal => (
                  <ConvictionCell
                    key={signal.sector}
                    signal={signal}
                    onClick={setSelected}
                    active={selected?.sector === signal.sector}
                  />
                ))}
              </div>
            </div>

            {/* Right panel: detail or news */}
            <div className="space-y-4">
              {selected ? (
                <SignalDetail
                  signal={selected}
                  onClose={() => setSelected(null)}
                  onExecute={s => { setSelected(null); setExecuting(s); }}
                />
              ) : (
                <>
                  <TopSignalsPanel signals={topSignals} onSelect={setSelected} />
                  <NewsFeed />
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {executing && (
        <ExecutionModal signal={executing} onClose={() => setExecuting(null)} />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-terminal-bright" }: {
  icon: React.ReactNode; label: string; value: string; color?: string;
}) {
  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3">
      <div className="flex items-center gap-2 text-terminal-text text-xs mb-1">
        {icon} {label}
      </div>
      <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
  );
}

function TopSignalsPanel({ signals, onSelect }: {
  signals: ConvictionSignal[]; onSelect: (s: ConvictionSignal) => void;
}) {
  if (!signals.length) return null;
  return (
    <div className="border border-signal-strong/30 rounded-xl bg-signal-strong/5">
      <div className="px-4 py-3 border-b border-signal-strong/20 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-signal-strong animate-pulse" />
        <span className="text-xs font-bold text-signal-strong tracking-widest">ACTIVE BUY SIGNALS</span>
      </div>
      <div className="divide-y divide-terminal-border">
        {signals.map(s => (
          <button
            key={s.sector}
            onClick={() => onSelect(s)}
            className="w-full text-left px-4 py-3 hover:bg-signal-strong/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-terminal-bright">{s.sector}</span>
              <span className="text-lg font-black text-signal-strong">{s.overallScore}</span>
            </div>
            <p className="text-xs text-terminal-text mt-0.5">{s.tokens.slice(0, 3).join(" · ")}</p>
            {s.narrative && (
              <p className="text-xs text-terminal-text mt-1 line-clamp-2 leading-relaxed">{s.narrative}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
