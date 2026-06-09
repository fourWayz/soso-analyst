"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import type { ConvictionSignal } from "@/lib/types";

interface Props { signals: ConvictionSignal[]; }

export default function ConvictionAlerts({ signals }: Props) {
  const [enabled, setEnabled]     = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const prevScores = useRef<Record<string, number>>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !signals.length) return;

    // Skip first load — only alert on subsequent score changes
    if (!initialized.current) {
      signals.forEach(s => { prevScores.current[s.sector] = s.overallScore; });
      initialized.current = true;
      return;
    }

    signals.forEach(signal => {
      const prev = prevScores.current[signal.sector] ?? signal.overallScore;
      const curr = signal.overallScore;

      if (prev < 75 && curr >= 75) {
        fire(
          `STRONG BUY — ${signal.sector}`,
          `Conviction ${curr}/100. All 3 institutional layers aligned.`
        );
      } else if (prev < 60 && curr >= 60) {
        fire(
          `BUY Signal — ${signal.sector}`,
          `Conviction ${curr}/100. Institutional activity detected.`
        );
      }

      prevScores.current[signal.sector] = curr;
    });
  }, [signals, enabled]);

  function fire(title: string, body: string) {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }

  async function toggle() {
    if (!enabled) {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") return;
      }
      initialized.current = false;
      setEnabled(true);
    } else {
      setEnabled(false);
    }
  }

  if (typeof window !== "undefined" && !("Notification" in window)) return null;

  return (
    <button
      onClick={toggle}
      title={enabled ? "Disable conviction alerts" : "Get notified when a sector crosses 60 or 75"}
      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs transition-colors ${
        enabled
          ? "border-signal-strong/60 text-signal-strong bg-signal-strong/10"
          : permission === "denied"
          ? "border-terminal-border text-terminal-text/40 cursor-not-allowed"
          : "border-terminal-border text-terminal-text hover:text-terminal-bright hover:border-terminal-bright"
      }`}
      disabled={permission === "denied"}
    >
      {enabled ? <Bell size={12} /> : <BellOff size={12} />}
      {enabled ? "Alerts ON" : "Alerts"}
    </button>
  );
}
