"use client";
import { useEffect, useState } from "react";
import type { SoSoNews } from "@/lib/types";

export default function NewsFeed() {
  const [news, setNews]       = useState<SoSoNews[]>([]);
  const [source, setSource]   = useState<"live" | "mock" | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/news")
        .then(r => r.json())
        .then(d => {
          setNews(d.news ?? []);
          setSource(d.source ?? null);
        })
        .catch(() => {});

    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!news.length) return null;

  return (
    <div className="border border-terminal-border rounded-xl bg-terminal-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-terminal-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-signal-strong animate-pulse" />
          <span className="text-xs font-bold text-terminal-bright tracking-widest">INTELLIGENCE FEED</span>
        </div>
        {source && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            source === "live"
              ? "text-signal-strong bg-signal-strong/10"
              : "text-signal-neutral bg-signal-neutral/10"
          }`}>
            {source === "live" ? "LIVE" : "MOCK"}
          </span>
        )}
      </div>
      <div className="divide-y divide-terminal-border max-h-72 overflow-y-auto">
        {news.map(item => (
          <div key={item.newsId} className="px-4 py-3 hover:bg-terminal-muted transition-colors">
            <p className="text-sm text-terminal-bright leading-snug">{item.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-terminal-text">{new Date(item.publishTime).toLocaleTimeString()}</span>
              {item.categories.slice(0, 2).map(c => (
                <span key={c} className="text-xs text-signal-neutral bg-signal-neutral/10 px-1.5 rounded">{c}</span>
              ))}
              {item.currencyCodes.slice(0, 2).map(c => (
                <span key={c} className="text-xs text-signal-strong bg-signal-strong/10 px-1.5 rounded">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
