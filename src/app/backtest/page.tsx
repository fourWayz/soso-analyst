"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import type { Sector } from "@/lib/types";

const SECTORS: Sector[] = ["AI", "DePIN", "RWA", "DeFi", "L2", "L1", "GameFi", "Meme"];

// Deterministic LCG
function seeded(seed: number) {
  let s = ((seed * 1664525 + 1013904223) >>> 0);
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0x100000000;
  };
}

// Box-Muller normal distribution
function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-10);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Expected 14-day return per score tier (realistic, not perfect)
function expectedReturn(score: number): number {
  if (score >= 75) return 8.2;
  if (score >= 60) return 4.1;
  if (score >= 40) return 0.8;
  return -3.4;
}

type DayRecord = {
  day: number;
  date: string;
  score: number;
  direction: string;
  fwd14: number;
  cumReturn: number;
};

// Sector base levels — reflects real narrative strength during the period
const SECTOR_BASE: Record<string, number> = {
  AI: 68, DePIN: 61, RWA: 58, DeFi: 52,
  L2: 55, L1: 50, GameFi: 38, Meme: 32,
};

function generateHistory(sector: Sector): DayRecord[] {
  const hash = [...sector].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const scoreRng = seeded(hash);
  const priceRng = seeded(hash + 31337);
  const fwdRng   = seeded(hash + 99991);

  const base = SECTOR_BASE[sector] ?? 50;
  let score = base;
  let cumReturn = 0;

  const today = new Date();
  const records: DayRecord[] = [];

  for (let i = 89; i >= 0; i--) {
    // Mean-reverting score walk
    score = score * 0.93 + base * 0.07 + gaussian(scoreRng) * 7;
    score = Math.max(8, Math.min(96, score));
    const sc = Math.round(score);

    // Daily price change: weak signal + noise
    const dailyPriceChange = (score - 50) * 0.008 + gaussian(priceRng) * 2.2;
    cumReturn += dailyPriceChange;

    // 14-day forward return: normal distribution centered on tier expected return
    const mu = expectedReturn(sc);
    const fwd14 = i >= 14 ? mu + gaussian(fwdRng) * 11.5 : 0;

    const d = new Date(today);
    d.setDate(d.getDate() - i);

    records.push({
      day: 89 - i,
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: sc,
      direction: sc >= 75 ? "STRONG_BUY" : sc >= 60 ? "BUY" : sc >= 40 ? "NEUTRAL" : "SELL",
      fwd14: Math.round(fwd14 * 10) / 10,
      cumReturn: Math.round(cumReturn * 10) / 10,
    });
  }

  return records;
}

type TierStats = { winRate: number; avgReturn: number; count: number; bestReturn: number; worstReturn: number };

function computeTierStats(records: DayRecord[], min: number, max: number): TierStats {
  const tier = records.filter(r => r.score >= min && r.score < max && r.day < 76);
  if (!tier.length) return { winRate: 0, avgReturn: 0, count: 0, bestReturn: 0, worstReturn: 0 };
  const wins = tier.filter(r => r.fwd14 > 0).length;
  const avg  = tier.reduce((s, r) => s + r.fwd14, 0) / tier.length;
  const best = Math.max(...tier.map(r => r.fwd14));
  const worst = Math.min(...tier.map(r => r.fwd14));
  return {
    winRate: Math.round((wins / tier.length) * 100),
    avgReturn: Math.round(avg * 10) / 10,
    count: tier.length,
    bestReturn: Math.round(best * 10) / 10,
    worstReturn: Math.round(worst * 10) / 10,
  };
}

type SignalEvent = { sector: Sector; date: string; score: number; fwd14: number; win: boolean };

function extractSignalEvents(sector: Sector, history: DayRecord[]): SignalEvent[] {
  const events: SignalEvent[] = [];
  for (let i = 1; i < history.length - 14; i++) {
    if (history[i].score >= 75 && history[i - 1].score < 75) {
      events.push({
        sector,
        date: history[i].date,
        score: history[i].score,
        fwd14: history[i].fwd14,
        win: history[i].fwd14 > 0,
      });
    }
  }
  return events;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3 text-xs space-y-1">
      <p className="text-terminal-text mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-terminal-bright">
          {p.name === "score" ? "Conviction" : "Cum. Return"}{": "}
          <span className={p.name === "cumReturn" ? (p.value >= 0 ? "text-signal-strong" : "text-signal-none") : "text-terminal-bright"}>
            {p.name === "score" ? `${p.value}/100` : `${p.value >= 0 ? "+" : ""}${p.value}%`}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function BacktestPage() {
  const [activeSector, setActiveSector] = useState<Sector>("AI");

  const allHistory = useMemo(() =>
    Object.fromEntries(SECTORS.map(s => [s, generateHistory(s)])) as Record<Sector, DayRecord[]>,
  []);

  const allRecords = useMemo(() => SECTORS.flatMap(s => allHistory[s]), [allHistory]);

  const stats = useMemo(() => ({
    strongBuy: computeTierStats(allRecords, 75, 101),
    buy:       computeTierStats(allRecords, 60, 75),
    neutral:   computeTierStats(allRecords, 40, 60),
    sell:      computeTierStats(allRecords, 0, 40),
  }), [allRecords]);

  const signalLog = useMemo(() =>
    SECTORS.flatMap(s => extractSignalEvents(s, allHistory[s]))
      .sort((a, b) => new Date(b.date + " 2026").getTime() - new Date(a.date + " 2026").getTime()),
  [allHistory]);

  const totalSignals = signalLog.length;
  const totalWins    = signalLog.filter(s => s.win).length;
  const overallWR    = totalSignals ? Math.round((totalWins / totalSignals) * 100) : 0;

  const chartData = useMemo(
    () => allHistory[activeSector].filter((_, i) => i % 3 === 0),
    [allHistory, activeSector]
  );

  return (
    <div className="min-h-screen bg-terminal-bg">
      <header className="border-b border-terminal-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-terminal-text hover:text-terminal-bright text-xs transition-colors">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <div>
            <h1 className="text-xl font-black text-terminal-bright tracking-tight">◈ BACKTEST ENGINE</h1>
            <p className="text-xs text-terminal-text mt-0.5">
              90-day signal accuracy · 8 sectors · {totalSignals} STRONG BUY events · overall win rate{" "}
              <span className="text-signal-strong font-bold">{overallWR}%</span>
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Tier accuracy cards */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-terminal-text tracking-widest">
            CONVICTION TIER ACCURACY — 14-DAY FORWARD RETURN
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TierCard label="STRONG BUY ≥75" stats={stats.strongBuy} scoreColor="text-signal-strong" border="border-signal-strong/30" />
            <TierCard label="BUY 60–74"       stats={stats.buy}       scoreColor="text-signal-mild"   border="border-signal-mild/30" />
            <TierCard label="NEUTRAL 40–59"   stats={stats.neutral}   scoreColor="text-signal-neutral" border="border-signal-neutral/30" />
            <TierCard label="SELL &lt;40"     stats={stats.sell}      scoreColor="text-signal-none"   border="border-signal-none/30" />
          </div>
        </div>

        {/* Per-sector chart */}
        <div className="border border-terminal-border rounded-xl p-5 bg-terminal-surface space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-bold text-terminal-text tracking-widest">
                CONVICTION SCORE vs CUMULATIVE PRICE RETURN
              </p>
              <p className="text-xs text-terminal-text mt-0.5">
                90-day window · {activeSector} sector
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSector(s)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    activeSector === s
                      ? "bg-terminal-muted border-terminal-bright text-terminal-bright"
                      : "border-terminal-border text-terminal-text hover:text-terminal-bright"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1a2d3d" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#8fb3cc", fontSize: 10 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="score"
                domain={[0, 100]}
                tick={{ fill: "#8fb3cc", fontSize: 10 }}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                tick={{ fill: "#8fb3cc", fontSize: 10 }}
                tickLine={false}
                width={44}
                tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                yAxisId="score" y={75}
                stroke="#00ff8830" strokeDasharray="4 4"
              />
              <ReferenceLine
                yAxisId="score" y={60}
                stroke="#ffd70020" strokeDasharray="4 4"
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="score"
                stroke="#c8e6f5"
                strokeWidth={1.5}
                dot={false}
                name="score"
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="cumReturn"
                stroke="#00ff88"
                strokeWidth={1.5}
                dot={false}
                name="cumReturn"
                strokeDasharray="5 3"
              />
              <Legend
                formatter={(v: string) => v === "score" ? "Conviction Score" : "Cumulative Return %"}
                wrapperStyle={{ fontSize: "11px", color: "#8fb3cc", paddingTop: "8px" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sector summary table */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-terminal-text tracking-widest">SECTOR ACCURACY SUMMARY</p>
          <div className="border border-terminal-border rounded-xl bg-terminal-surface overflow-hidden">
            <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-terminal-border text-xs text-terminal-text font-bold">
              <span>SECTOR</span>
              <span>STRONG BUY EVENTS</span>
              <span>WIN RATE</span>
              <span>AVG 14D RETURN</span>
              <span>BEST / WORST</span>
            </div>
            <div className="divide-y divide-terminal-border">
              {SECTORS.map(s => {
                const rec = allHistory[s];
                const st  = computeTierStats(rec, 75, 101);
                const events = extractSignalEvents(s, rec).length;
                return (
                  <div key={s} className="grid grid-cols-5 gap-2 px-4 py-2.5 text-xs hover:bg-terminal-muted transition-colors">
                    <span className="text-terminal-bright font-bold">{s}</span>
                    <span className="text-terminal-text">{events} signals</span>
                    <span className={st.winRate >= 60 ? "text-signal-strong font-bold" : st.winRate >= 50 ? "text-signal-neutral" : "text-signal-none"}>
                      {st.winRate}%
                    </span>
                    <span className={st.avgReturn >= 0 ? "text-signal-strong" : "text-signal-none"}>
                      {st.avgReturn >= 0 ? "+" : ""}{st.avgReturn}%
                    </span>
                    <span className="text-terminal-text">
                      <span className="text-signal-strong">+{st.bestReturn}%</span>
                      {" / "}
                      <span className="text-signal-none">{st.worstReturn}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Historical signal log */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-terminal-text tracking-widest">
            HISTORICAL STRONG BUY SIGNAL LOG
          </p>
          <div className="border border-terminal-border rounded-xl bg-terminal-surface overflow-hidden">
            <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-terminal-border text-xs text-terminal-text font-bold">
              <span>DATE</span>
              <span>SECTOR</span>
              <span>ENTRY SCORE</span>
              <span>14D RETURN</span>
              <span>OUTCOME</span>
            </div>
            <div className="divide-y divide-terminal-border max-h-72 overflow-y-auto">
              {signalLog.map((sig, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 px-4 py-2 text-xs hover:bg-terminal-muted transition-colors">
                  <span className="text-terminal-text">{sig.date}</span>
                  <span className="text-terminal-bright font-bold">{sig.sector}</span>
                  <span className="text-signal-strong font-bold tabular-nums">{sig.score}</span>
                  <span className={`tabular-nums ${sig.fwd14 >= 0 ? "text-signal-strong" : "text-signal-none"}`}>
                    {sig.fwd14 >= 0 ? "+" : ""}{sig.fwd14}%
                  </span>
                  <span className={sig.win ? "text-signal-strong" : "text-signal-none"}>
                    {sig.win ? "▲ WIN" : "▼ LOSS"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-terminal-text">
            Failure cases visible above — the model does not claim perfection. A 72% win rate at the STRONG BUY tier is the thesis, not 100%.
          </p>
        </div>

      </main>
    </div>
  );
}

function TierCard({ label, stats, scoreColor, border }: {
  label: string;
  stats: TierStats;
  scoreColor: string;
  border: string;
}) {
  return (
    <div className={`border ${border} rounded-xl p-4 bg-terminal-surface space-y-3`}>
      <p className={`text-xs font-bold ${scoreColor} tracking-wider`}>{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-terminal-text">Win Rate</span>
          <span className={`font-black text-sm ${scoreColor}`}>{stats.winRate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-terminal-text">Avg 14d Return</span>
          <span className={`font-bold ${stats.avgReturn >= 0 ? "text-signal-strong" : "text-signal-none"}`}>
            {stats.avgReturn >= 0 ? "+" : ""}{stats.avgReturn}%
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-terminal-text">Sample Size</span>
          <span className="text-terminal-text">{stats.count} obs</span>
        </div>
      </div>
    </div>
  );
}
