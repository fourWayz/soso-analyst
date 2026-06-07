'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Zap,
  ChevronRight, Copy, Check, Wallet, Loader2, CheckCircle2, XCircle,
  BookOpen,
} from 'lucide-react';
import type { GeneratedReport, TradeIdea } from '@/lib/claude';
import {
  isMetaMaskAvailable, connectWallet, getConnectedAccount,
  signAuthNonce, generateClOrdID, formatAddress,
} from '@/lib/eip712';
import ETFFlowChart from './ETFFlowChart';

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
      report.title, report.subtitle, '',
      `Signal: ${report.signal} (${report.confidence}% confidence)`, '',
      report.executiveSummary, '',
      ...report.sections.map(s => `## ${s.heading}\n${s.content}`), '',
      `Key Risks: ${report.keyRisks.join('; ')}`, '',
      `Actionable Insight: ${report.actionableInsight}`, '',
      `Published: ${report.publishedAt}`,
      `Source: SoSoValue Terminal + Claude AI`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0d1224] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${signalColor}`}>
                <SignalIcon size={12} />
                {report.signal}
              </span>
              <span className="text-xs text-white/40">{report.confidence}% confidence</span>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs text-white/30">{new Date(report.publishedAt).toLocaleString()}</span>
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

        {/* ETF Flow Chart — always shown, self-fetches */}
        <ETFFlowChart />
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
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                  report.tradeIdea.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {report.tradeIdea.direction}
                </span>
                <span className="font-semibold">{report.tradeIdea.asset}</span>
                <span className="text-white/40 text-sm">({report.tradeIdea.targetSymbol})</span>
              </div>
              <p className="text-xs text-white/40 mt-1">{report.tradeIdea.entryRationale}</p>
            </div>
            <button
              onClick={() => setShowTradeGate(v => !v)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <Zap size={14} /> Trade on SoDEX
            </button>
          </div>

          {showTradeGate && (
            <EIP712TradeGate
              idea={report.tradeIdea}
              onDone={() => {
                setShowTradeGate(false);
                if (onTrade && report.tradeIdea) onTrade(report.tradeIdea);
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

// ─── Order Book Slippage Preview ──────────────────────────────────────────────

interface OrderBookData {
  bestAsk: number;
  bestBid: number;
  spread: number;
}

function useOrderBook(symbol: string | undefined) {
  const [ob, setOb] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sodex?path=/markets/${symbol}/orderbook&limit=5`);
      const json = await res.json();
      const bids: [string, string][] = json?.data?.bids ?? json?.bids ?? [];
      const asks: [string, string][] = json?.data?.asks ?? json?.asks ?? [];
      if (bids.length && asks.length) {
        setOb({
          bestBid: parseFloat(bids[0][0]),
          bestAsk: parseFloat(asks[0][0]),
          spread: parseFloat(asks[0][0]) - parseFloat(bids[0][0]),
        });
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { ob, loading, refresh: fetch_ };
}

function SlippagePreview({ symbol, price, side }: { symbol: string; price: string; side: 'BUY' | 'SELL' }) {
  const { ob, loading } = useOrderBook(symbol);
  if (loading) return <div className="text-xs text-white/30 animate-pulse">Fetching order book...</div>;
  if (!ob) return null;

  const enteredPrice = parseFloat(price);
  const referencePrice = side === 'BUY' ? ob.bestAsk : ob.bestBid;
  const slippage = enteredPrice && referencePrice
    ? ((Math.abs(enteredPrice - referencePrice) / referencePrice) * 100)
    : null;

  return (
    <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1.5">
      <div className="flex items-center gap-1.5 text-white/40 mb-2">
        <BookOpen size={11} /> Order Book Preview
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Best Ask</span>
        <span className="text-rose-400">${ob.bestAsk.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Best Bid</span>
        <span className="text-emerald-400">${ob.bestBid.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/40">Spread</span>
        <span>${ob.spread.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
      </div>
      {slippage !== null && enteredPrice > 0 && (
        <div className="flex justify-between border-t border-white/10 pt-1.5">
          <span className="text-white/40">Est. slippage</span>
          <span className={slippage > 1 ? 'text-amber-400 font-semibold' : 'text-white/60'}>
            {slippage.toFixed(3)}%{slippage > 1 ? ' ⚠' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── EIP-712 Trade Gate ────────────────────────────────────────────────────────

type TradeStatus = 'idle' | 'connecting' | 'signing' | 'submitting' | 'success' | 'error';

function EIP712TradeGate({ idea, onDone, onCancel }: {
  idea: TradeIdea;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<TradeStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [riskChecked, setRiskChecked] = useState(false);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('0.001');
  const hasMM = isMetaMaskAvailable();
  const side: 'BUY' | 'SELL' = idea.direction === 'LONG' ? 'BUY' : 'SELL';

  useEffect(() => { getConnectedAccount().then(setAccount); }, []);

  const handleConnect = async () => {
    setStatus('connecting');
    setErrorMsg('');
    try {
      setAccount(await connectWallet());
      setStatus('idle');
    } catch (e) {
      setErrorMsg(String(e));
      setStatus('error');
    }
  };

  const handleSign = async () => {
    if (!account || !price || !quantity || !riskChecked) return;
    setStatus('signing');
    setErrorMsg('');
    try {
      // 1. Resolve symbolID from /markets/symbols
      const symRes = await fetch(`/api/sodex?path=/markets/symbols&symbol=${idea.targetSymbol}`);
      const symJson = await symRes.json();
      const symbols: { id: number; name: string }[] = Array.isArray(symJson?.data) ? symJson.data
        : Array.isArray(symJson) ? symJson : [];
      const sym = symbols.find(s => s.name === idea.targetSymbol);
      if (!sym) throw new Error(`Symbol ${idea.targetSymbol} not found on SoDEX. Ensure it is a valid trading pair.`);

      // 2. Resolve accountID from /accounts/{address}
      const acctRes = await fetch(`/api/sodex?path=/accounts/${account}`);
      const acctJson = await acctRes.json();
      const accountID: number | undefined = acctJson?.data?.id ?? acctJson?.id;
      if (!accountID) throw new Error('SoDEX account not found. Connect your wallet to SoDEX and fund it before placing orders.');

      // 3. Sign nonce with EIP-712 for X-API-Sign header (master-wallet auth, no separate API key needed)
      const nonce = Date.now();
      const apiSign = await signAuthNonce(account, nonce);

      // 4. Build BatchNewOrderRequest with correct enum values
      const orderRequest = {
        accountID,
        orders: [{
          symbolID: sym.id,
          clOrdID: generateClOrdID(),
          side: side === 'BUY' ? 1 : 2,
          type: 1,           // LIMIT
          timeInForce: 1,    // GTC
          price,
          quantity,
        }],
      };

      setStatus('submitting');
      const res = await fetch('/api/sodex?path=/trade/orders/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Sign': apiSign,
          'X-API-Nonce': String(nonce),
        },
        body: JSON.stringify(orderRequest),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Order failed: ${res.status}`);
      }
      setStatus('success');
      setTimeout(onDone, 2000);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg flex items-center gap-3">
        <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-400">Order submitted to SoDEX</p>
          <p className="text-xs text-white/40 mt-0.5">EIP-712 signed order accepted by the matching engine</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-400">EIP-712 Order Signing — SoDEX</p>
          <p className="text-xs text-white/50 mt-0.5">
            Your order is signed with MetaMask typed data and submitted directly to the SoDEX matching engine.
          </p>
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-white/40">Symbol</span><span className="font-mono">{idea.targetSymbol}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Side</span>
          <span className={`font-semibold ${side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{side} · LIMIT</span>
        </div>
      </div>

      {/* Price / qty inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 mb-1 block">Price (USDC)</label>
          <input
            type="number"
            placeholder="e.g. 65000"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">Quantity ({idea.asset})</label>
          <input
            type="number"
            placeholder="e.g. 0.001"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Order book slippage */}
      {idea.targetSymbol && (
        <SlippagePreview symbol={idea.targetSymbol} price={price} side={side} />
      )}

      {/* Wallet */}
      {!hasMM ? (
        <div className="text-xs text-white/40 border border-white/10 rounded p-3">
          MetaMask not detected.{' '}
          <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Install MetaMask
          </a>{' '}
          to sign orders on-chain.
        </div>
      ) : account ? (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Connected: {formatAddress(account)}
        </div>
      ) : (
        <button onClick={handleConnect} disabled={status === 'connecting'}
          className="w-full flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
          {status === 'connecting' ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
          Connect MetaMask
        </button>
      )}

      {/* Risk checkbox */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={riskChecked} onChange={e => setRiskChecked(e.target.checked)} className="mt-0.5 rounded" />
        <span className="text-xs text-white/50">
          I understand this is a research-based trade idea and accept full responsibility for my trading decisions.
        </span>
      </label>

      {status === 'error' && (
        <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/5 border border-rose-500/20 rounded p-2">
          <XCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-white/20 hover:border-white/40 rounded-lg transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSign}
          disabled={!account || !price || !quantity || !riskChecked || status === 'signing' || status === 'submitting'}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {status === 'signing' ? (
            <><Loader2 size={14} className="animate-spin" /> Waiting for MetaMask...</>
          ) : status === 'submitting' ? (
            <><Loader2 size={14} className="animate-spin" /> Submitting to SoDEX...</>
          ) : (
            <><Zap size={14} /> Sign &amp; Submit Order</>
          )}
        </button>
      </div>
    </div>
  );
}
