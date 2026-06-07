export interface StoredSignal {
  id: string;
  type: 'daily_brief' | 'asset_deep_dive' | 'theme_report';
  label: string;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  priceAtGeneration?: number;
  symbol?: string;
  targetSymbol?: string;
  timestamp: string;
}

export interface ScoredSignal extends StoredSignal {
  currentPrice?: number;
  priceChangePct?: number;
  outcome?: 'HIT' | 'MISS' | 'PENDING';
}

const STORAGE_KEY = 'soso_signals_v2';

export function saveSignal(data: Omit<StoredSignal, 'id'>): StoredSignal {
  const all = loadSignals();
  const entry: StoredSignal = { ...data, id: crypto.randomUUID() };
  all.unshift(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
  } catch {
    // ignore quota errors
  }
  return entry;
}

export function loadSignals(): StoredSignal[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredSignal[];
  } catch {
    return [];
  }
}

export function clearSignals(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function scoreSignal(s: StoredSignal, currentPrice?: number): ScoredSignal {
  if (!s.priceAtGeneration || !currentPrice) {
    return { ...s, outcome: 'PENDING' };
  }
  const priceChangePct = ((currentPrice - s.priceAtGeneration) / s.priceAtGeneration) * 100;
  let outcome: 'HIT' | 'MISS' | 'PENDING';
  if (s.signal === 'BULLISH') outcome = priceChangePct > 0 ? 'HIT' : 'MISS';
  else if (s.signal === 'BEARISH') outcome = priceChangePct < 0 ? 'HIT' : 'MISS';
  else outcome = 'PENDING';
  return { ...s, currentPrice, priceChangePct, outcome };
}

export function computeHitRate(signals: ScoredSignal[]): number {
  const scored = signals.filter(s => s.outcome === 'HIT' || s.outcome === 'MISS');
  if (scored.length === 0) return 0;
  return Math.round((signals.filter(s => s.outcome === 'HIT').length / scored.length) * 100);
}
