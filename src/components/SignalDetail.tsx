"use client";
import clsx from "clsx";
import { X } from "lucide-react";
import ScoreBar from "./ScoreBar";
import DirectionBadge from "./DirectionBadge";
import type { ConvictionSignal } from "@/lib/types";

interface Props {
  signal: ConvictionSignal;
  onClose: () => void;
  onExecute: (signal: ConvictionSignal) => void;
}

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function SignalDetail({ signal, onClose, onExecute }: Props) {
  const { fundraising: f, institutional: i, macro: m } = signal;

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-terminal-bright">{signal.sector} Sector</h2>
          <p className="text-sm text-terminal-text mt-1">
            Last updated {new Date(signal.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <button onClick={onClose} className="text-terminal-text hover:text-terminal-bright p-1">
          <X size={18} />
        </button>
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-4 p-4 bg-terminal-muted rounded-lg">
        <div className={clsx(
          "text-5xl font-black",
          signal.overallScore >= 75 ? "text-signal-strong" :
          signal.overallScore >= 60 ? "text-signal-mild" :
          signal.overallScore >= 40 ? "text-signal-neutral" :
          "text-signal-none"
        )}>
          {signal.overallScore}
        </div>
        <div className="flex-1">
          <DirectionBadge direction={signal.direction} />
          <p className="text-xs text-terminal-text mt-2">Conviction Score (0–100)</p>
          <p className="text-xs text-terminal-text">Weighted: L1×30% + L2×35% + L3×35%</p>
        </div>
      </div>

      {/* Claude Narrative */}
      {signal.narrative && (
        <div className="border border-terminal-border rounded-lg p-3 bg-terminal-bg">
          <p className="text-xs text-terminal-text mb-1">◈ AI NARRATIVE ANALYSIS</p>
          <p className="text-sm text-terminal-bright leading-relaxed">{signal.narrative}</p>
        </div>
      )}

      {/* 3 layers breakdown */}
      <div className="grid grid-cols-1 gap-4">
        {/* Layer 1 */}
        <div className="border border-terminal-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-terminal-bright">Layer 1 — Fundraising</span>
            <span className="text-lg font-black text-signal-strong">{signal.layer1Score}</span>
          </div>
          <ScoreBar score={signal.layer1Score} />
          {f && (
            <div className="mt-3 space-y-1 text-xs text-terminal-text">
              <p>{f.recentRounds} rounds in 30 days · {fmt(f.totalRaised)} raised</p>
              {f.projects.slice(0, 3).map(p => (
                <div key={p.name} className="flex justify-between">
                  <span className="text-terminal-bright">{p.name}</span>
                  <span>{fmt(p.amount)} · {p.stage}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layer 2 */}
        <div className="border border-terminal-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-terminal-bright">Layer 2 — Institutional</span>
            <span className="text-lg font-black text-signal-mild">{signal.layer2Score}</span>
          </div>
          <ScoreBar score={signal.layer2Score} />
          {i && (
            <div className="mt-3 space-y-1 text-xs text-terminal-text">
              <p>{i.btcTreasuryPurchases.toLocaleString()} BTC purchased recently</p>
              <p>Crypto stocks avg {i.cryptoStockMomentum.toFixed(1)}% move</p>
              {i.companies.slice(0, 3).map(c => (
                <div key={c.ticker} className="flex justify-between">
                  <span className="text-terminal-bright">{c.name} ({c.ticker})</span>
                  <span className={c.action === "BUY" ? "text-signal-strong" : "text-terminal-text"}>{c.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layer 3 */}
        <div className="border border-terminal-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-terminal-bright">Layer 3 — Macro / ETF</span>
            <span className="text-lg font-black text-signal-neutral">{signal.layer3Score}</span>
          </div>
          <ScoreBar score={signal.layer3Score} />
          {m && (
            <div className="mt-3 space-y-1 text-xs text-terminal-text">
              <p>7-day ETF flow: <span className={m.etfNetFlow >= 0 ? "text-signal-strong" : "text-signal-none"}>{fmt(Math.abs(m.etfNetFlow))} {m.etfNetFlow >= 0 ? "inflow" : "outflow"}</span></p>
              {m.upcomingEvents.slice(0, 2).map(e => (
                <div key={e.name} className="flex justify-between">
                  <span className="text-terminal-bright">{e.name}</span>
                  <span>{e.date} · avg {e.historicalImpact > 0 ? "+" : ""}{e.historicalImpact}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top tokens */}
      <div>
        <p className="text-xs text-terminal-text mb-2">TOP TOKENS IN SECTOR</p>
        <div className="flex flex-wrap gap-2">
          {signal.tokens.map(t => (
            <span key={t} className="text-sm font-bold text-terminal-bright bg-terminal-muted px-3 py-1 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Execute button */}
      {(signal.direction === "STRONG_BUY" || signal.direction === "BUY") && (
        <button
          onClick={() => onExecute(signal)}
          className="w-full py-3 rounded-lg font-bold text-sm bg-signal-strong/20 border border-signal-strong text-signal-strong hover:bg-signal-strong/30 transition-colors"
        >
          ▲ EXECUTE ON SoDEX — {signal.tokens[0]} / {signal.tokens[1]}
        </button>
      )}
    </div>
  );
}
