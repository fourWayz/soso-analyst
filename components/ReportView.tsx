'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';
import type { GeneratedReport, TradeIdea } from '@/lib/claude';

interface Props {
  report: GeneratedReport;
  onTrade?: (idea: TradeIdea) => void;
}

export default function ReportView({ report, onTrade }: Props) {
  const [copied, setCopied] = useState(false);
  const [showTradeGate, setShowTradeGate] = useState(false);

  const signalColor = {
    BULLISH: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    BEARISH: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    NEUTRAL: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  }[report.signal];

  const SignalIcon = report.signal === 'BULLISH' ? TrendingUp : report.signal === 'BEARISH' ? TrendingDown : Minus;

  const copyReport = () => {
    const text = [
      report.title,
      report.subtitle,
      '',
      `Signal: ${report.signal} (${report.confidence}% confidence)`,
      '',
      report.executiveSummary,
      '',
      ...report.sections.map(s => `## ${s.heading}\n${s.content}`),
      '',
      `Key Risks: ${report.keyRisks.join('; ')}`,
      '',
      `Actionable Insight: ${report.actionableInsight}`,
      '',
      `Published: ${report.publishedAt}`,
      `Source: SoSoValue Terminal + Claude AI`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0d1224] border border-white/10 rounded-xl overflow-hidden">
      {/* Report header */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${signalColor}`}>
                <SignalIcon size={12} />
                {report.signal}
              </span>
              <span className="text-xs text-white/40">
                {report.confidence}% confidence
              </span>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs text-white/30">
                {new Date(report.publishedAt).toLocaleString()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">{report.title}</h1>
            <p className="text-sm text-white/50">{report.subtitle}</p>
          </div>
          <button onClick={copyReport}
            className="flex items-center gap-1.5 text-xs border border-white/20 hover:border-white/40 px-3 py-1.5 rounded transition-colors flex-shrink-0">
            {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="px-6 py-5 bg-white/[0.02] border-b border-white/5">
        <h2 className="text-xs text-white/40 uppercase tracking-wider mb-3">Executive Summary</h2>
        <p className="text-sm text-white/80 leading-relaxed">{report.executiveSummary}</p>
      </div>

      {/* Confidence bar */}
      <div className="px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30 w-28">AI Confidence</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${report.signal === 'BULLISH' ? 'bg-emerald-500' : report.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-amber-500'}`}
              style={{ width: `${report.confidence}%` }}
            />
          </div>
          <span className="text-xs font-mono text-white/60">{report.confidence}%</span>
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 py-5 space-y-5">
        {report.sections.map((section, i) => (
          <div key={i} className="pb-5 border-b border-white/5 last:border-0">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <ChevronRight size={14} className="text-blue-400" />
              {section.heading}
            </h3>
            <p className="text-sm text-white/60 leading-relaxed pl-5">{section.content}</p>
          </div>
        ))}
      </div>

      {/* Key Risks */}
      <div className="px-6 py-4 bg-rose-500/5 border-t border-rose-500/10">
        <h3 className="text-xs text-rose-400/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle size={12} /> Key Risks
        </h3>
        <div className="space-y-1.5">
          {report.keyRisks.map((risk, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-white/50">
              <span className="text-rose-400/50 mt-0.5">—</span>
              <span>{risk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Insight */}
      <div className="px-6 py-4 bg-blue-500/5 border-t border-blue-500/10">
        <h3 className="text-xs text-blue-400/70 uppercase tracking-wider mb-2">Actionable Insight</h3>
        <p className="text-sm text-white/70 leading-relaxed">{report.actionableInsight}</p>
      </div>

      {/* Trade Gate */}
      {report.tradeIdea && (
        <div className="px-6 py-5 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs text-white/40 mb-1">Trade Idea · SoDEX</div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${report.tradeIdea.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {report.tradeIdea.direction}
                </span>
                <span className="font-semibold">{report.tradeIdea.asset}</span>
                <span className="text-white/40 text-sm">({report.tradeIdea.targetSymbol})</span>
              </div>
              <p className="text-xs text-white/40 mt-1">{report.tradeIdea.entryRationale}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTradeGate(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <Zap size={14} /> Trade on SoDEX
              </button>
              <a href="https://sodex.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 border border-white/20 hover:border-white/40 px-3 py-2 rounded-lg text-sm transition-colors">
                <ExternalLink size={14} /> SoDEX
              </a>
            </div>
          </div>

          {/* Trade confirmation gate */}
          {showTradeGate && (
            <TradeConfirmGate
              idea={report.tradeIdea}
              onConfirm={() => {
                if (onTrade && report.tradeIdea) onTrade(report.tradeIdea);
                setShowTradeGate(false);
              }}
              onCancel={() => setShowTradeGate(false)}
            />
          )}
        </div>
      )}

      {/* Citations */}
      {report.citations.length > 0 && (
        <div className="px-6 py-4 border-t border-white/5">
          <h3 className="text-xs text-white/30 uppercase tracking-wider mb-2">Data Sources · SoSoValue Terminal</h3>
          <div className="flex flex-wrap gap-2">
            {report.citations.map((c, i) => (
              <span key={i} className="text-xs text-white/30 border border-white/10 rounded px-2 py-0.5">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TradeConfirmGate({ idea, onConfirm, onCancel }: {
  idea: TradeIdea;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-400 mb-1">Trade Confirmation Required</p>
          <p className="text-xs text-white/50">
            You are about to place a <strong className="text-white">{idea.direction}</strong> order on <strong className="text-white">{idea.targetSymbol}</strong> via SoDEX.
            This action will interact with the SoDEX order book. Review the trade idea and confirm you understand the risks.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="checkbox"
          id="risk-confirm"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="risk-confirm" className="text-xs text-white/60 cursor-pointer">
          I understand this is a research-based trade idea and I accept full responsibility for my trading decisions.
        </label>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="px-4 py-2 text-sm border border-white/20 hover:border-white/40 rounded-lg transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={!confirmed}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Confirm — Open SoDEX
        </button>
      </div>
    </div>
  );
}
