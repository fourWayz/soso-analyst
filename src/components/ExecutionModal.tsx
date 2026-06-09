"use client";
import { useState } from "react";
import { X, AlertTriangle, Wallet } from "lucide-react";
import { useWalletClient, useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { ConvictionSignal } from "@/lib/types";
import { signBatchOrderWithWagmi, buildMarketBuy, buildLimitBuy } from "@/lib/sodex/signer";

interface Props {
  signal: ConvictionSignal;
  onClose: () => void;
}

type Status = "idle" | "signing" | "submitting" | "success" | "error";
type OrderType = "market" | "limit";

const TOKEN_TO_SYMBOL: Record<string, string> = {
  BTC: "vBTC_vUSDC", ETH: "vETH_vUSDC", SOL: "vSOL_vUSDC",
  ARB: "vARB_vUSDC", OP: "vOP_vUSDC",   ONDO: "vONDO_vUSDC",
  RENDER: "vRENDER_vUSDC", FET: "vFET_vUSDC", AGIX: "vAGIX_vUSDC",
  IOTX: "vIOTX_vUSDC", HNT: "vHNT_vUSDC",
};

function getSymbol(token: string): string {
  return TOKEN_TO_SYMBOL[token] ?? `v${token}_vUSDC`;
}

export default function ExecutionModal({ signal, onClose }: Props) {
  const token  = signal.tokens[0] ?? "BTC";
  const symbol = getSymbol(token);

  const { data: walletClient }   = useWalletClient();
  const { isConnected, address } = useAccount();

  const [orderType, setOrderType]   = useState<OrderType>("market");
  const [quantity, setQuantity]     = useState("0.01");
  const [limitPrice, setLimitPrice] = useState("");
  const [status, setStatus]         = useState<Status>("idle");
  const [resultMsg, setResultMsg]   = useState("");
  const [error, setError]           = useState("");

  async function handleExecute() {
    if (!walletClient) return;
    setStatus("signing");
    setError("");
    try {
      const params = orderType === "market"
        ? buildMarketBuy(symbol, quantity)
        : buildLimitBuy(symbol, limitPrice, quantity);

      const signed = await signBatchOrderWithWagmi(params, walletClient);
      setStatus("submitting");

      const res = await fetch("/api/execute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          apiKey:    signed.apiKey,
          signature: signed.signature,
          nonce:     signed.nonce,
          params:    signed.body,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Submission failed");

      const orderId = data.orders?.[0]?.orderID ?? "submitted";
      setResultMsg(`Order #${orderId} confirmed on SoDEX testnet`);
      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Execution failed");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 w-full max-w-md space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-terminal-bright">Execute Trade</h3>
            <p className="text-xs text-terminal-text mt-0.5">{symbol} · SoDEX Testnet</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-terminal-text hover:text-terminal-bright" /></button>
        </div>

        {/* Conviction summary */}
        <div className="bg-terminal-muted rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-terminal-text">Conviction Score</span>
            <span className="text-signal-strong font-bold">{signal.overallScore}/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-text">Direction</span>
            <span className="text-signal-strong font-bold">{signal.direction}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-terminal-text">Sector</span>
            <span className="text-terminal-bright">{signal.sector}</span>
          </div>
        </div>

        {/* Wallet connect gate */}
        {!isConnected ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-signal-neutral/10 border border-signal-neutral/30 rounded-lg p-3">
              <Wallet size={14} className="text-signal-neutral mt-0.5 shrink-0" />
              <p className="text-xs text-signal-neutral">
                Connect a wallet to sign orders. Your EVM address becomes the API key —
                no separate registration needed on testnet.
              </p>
            </div>
            <div className="flex justify-center">
              <ConnectButton label="Connect Wallet" />
            </div>
          </div>
        ) : (
          <>
            {/* Connected address */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-signal-strong" />
              <span className="font-mono text-terminal-text">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
              <span className="text-terminal-text/50">· SoDEX API key</span>
            </div>

            {/* Order type toggle */}
            <div className="flex rounded-lg overflow-hidden border border-terminal-border">
              {(["market", "limit"] as OrderType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    orderType === t
                      ? "bg-terminal-muted text-terminal-bright"
                      : "text-terminal-text hover:text-terminal-bright"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Limit price */}
            {orderType === "limit" && (
              <div>
                <label className="text-xs text-terminal-text block mb-1">Limit Price (vUSDC)</label>
                <input
                  type="number" step="0.01" value={limitPrice}
                  onChange={e => setLimitPrice(e.target.value)}
                  placeholder="e.g. 91000"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-terminal-bright text-sm font-mono focus:outline-none focus:border-signal-neutral"
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-xs text-terminal-text block mb-1">Quantity ({token})</label>
              <input
                type="number" step="0.001" min="0.001" value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-terminal-bright text-sm font-mono focus:outline-none focus:border-signal-strong"
              />
            </div>

            {/* Testnet notice */}
            <div className="flex items-start gap-2 bg-signal-neutral/10 border border-signal-neutral/30 rounded-lg p-3">
              <AlertTriangle size={14} className="text-signal-neutral mt-0.5 shrink-0" />
              <p className="text-xs text-signal-neutral">
                Executing on SoDEX testnet (chainId 138565). Requires testnet funds.
                EIP-712 signing — no ETH gas required.
              </p>
            </div>

            {/* Error */}
            {status === "error" && (
              <p className="text-xs text-signal-none bg-signal-none/10 border border-signal-none/30 rounded p-2 break-words">
                {error}
              </p>
            )}

            {/* Success */}
            {status === "success" && (
              <p className="text-xs text-signal-strong bg-signal-strong/10 border border-signal-strong/30 rounded p-2">
                ✓ {resultMsg}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-terminal-border text-terminal-text text-sm hover:bg-terminal-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={["signing", "submitting", "success"].includes(status) || (orderType === "limit" && !limitPrice)}
                className="flex-1 py-2.5 rounded-lg bg-signal-strong/20 border border-signal-strong text-signal-strong font-bold text-sm hover:bg-signal-strong/30 disabled:opacity-50 transition-colors"
              >
                {status === "signing"    ? "Signing EIP-712..."  :
                 status === "submitting" ? "Sending to SoDEX..."  :
                 status === "success"    ? "✓ Done"               :
                 `Buy ${token}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
