"use client";
import clsx from "clsx";
import ScoreBar from "./ScoreBar";
import DirectionBadge from "./DirectionBadge";
import type { ConvictionSignal } from "@/lib/types";

interface Props {
  signal: ConvictionSignal;
  onClick: (s: ConvictionSignal) => void;
  active: boolean;
}

function fmtM(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

export default function ConvictionCell({ signal, onClick, active }: Props) {
  const { fundraising: f, institutional: i, macro: m } = signal;

  const borderClass =
    signal.overallScore >= 75 ? "border-signal-strong/40 shadow-[0_0_8px_#00ff8825]" :
    signal.overallScore >= 60 ? "border-signal-mild/30 shadow-[0_0_8px_#66ffbb15]" :
    signal.overallScore >= 40 ? "border-signal-neutral/25" :
    "border-signal-none/25";

  return (
    <button
      onClick={() => onClick(signal)}
      className={clsx(
        "conviction-cell w-full text-left p-4 rounded-lg border bg-terminal-surface",
        "hover:bg-terminal-muted transition-colors",
        borderClass,
        active && "ring-1 ring-terminal-bright"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-terminal-bright tracking-wide">
          {signal.sector}
        </span>
        <span className={clsx(
          "text-2xl font-black tabular-nums",
          signal.overallScore >= 75 ? "text-signal-strong" :
          signal.overallScore >= 60 ? "text-signal-mild" :
          signal.overallScore >= 40 ? "text-signal-neutral" :
          signal.overallScore >= 25 ? "text-signal-weak" :
          "text-signal-none"
        )}>
          {signal.overallScore}
        </span>
      </div>

      {/* 3 Layer bars */}
      <div className="space-y-2 mb-2">
        <ScoreBar score={signal.layer1Score} label="L1 Fundraising" size="sm" />
        <ScoreBar score={signal.layer2Score} label="L2 Institutional" size="sm" />
        <ScoreBar score={signal.layer3Score} label="L3 Macro/ETF" size="sm" />
      </div>

      {/* Inline data citations */}
      <div className="space-y-0.5 mb-3 border-t border-terminal-border pt-2">
        {f && (
          <p className="text-xs text-terminal-text leading-tight">
            <span className="text-terminal-bright/60">L1</span>{" "}
            {f.totalRaised > 0 ? `${fmtM(f.totalRaised)} · ${f.recentRounds} rounds` : "no recent rounds"}
          </p>
        )}
        {i && (
          <p className="text-xs text-terminal-text leading-tight">
            <span className="text-terminal-bright/60">L2</span>{" "}
            {i.btcTreasuryPurchases > 0 ? `${i.btcTreasuryPurchases.toLocaleString()} BTC` : "no BTC"}{" "}
            · stocks {i.cryptoStockMomentum >= 0 ? "+" : ""}{i.cryptoStockMomentum.toFixed(1)}%
          </p>
        )}
        {m && (
          <p className="text-xs text-terminal-text leading-tight">
            <span className="text-terminal-bright/60">L3</span>{" "}
            {fmtM(Math.abs(m.etfNetFlow))} {m.etfNetFlow >= 0 ? "inflow" : "outflow"}
            {m.upcomingEvents[0] ? ` · macro ${m.upcomingEvents[0].historicalImpact >= 0 ? "+" : ""}${m.upcomingEvents[0].historicalImpact}% avg` : ""}
          </p>
        )}
      </div>

      {/* Direction */}
      <DirectionBadge direction={signal.direction} />

      {/* Top tokens */}
      <div className="mt-2 flex flex-wrap gap-1">
        {signal.tokens.slice(0, 3).map(t => (
          <span key={t} className="text-xs text-terminal-text bg-terminal-muted px-1.5 py-0.5 rounded font-mono">
            {t}
          </span>
        ))}
      </div>
    </button>
  );
}
