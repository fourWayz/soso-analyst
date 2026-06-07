export interface FeedEntry {
  id: string;
  analystAddress: string;
  type: 'daily_brief' | 'asset_deep_dive' | 'theme_report';
  label: string;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  title: string;
  executiveSummary: string;
  priceAtPublish?: number;
  symbol?: string;
  targetSymbol?: string;
  publishedAt: string;
  // Scored after 72h using SoDEX klines
  outcome?: 'HIT' | 'MISS' | 'PENDING';
  priceAt72h?: number;
  priceChangePct?: number;
}

const STORAGE_KEY = 'soso_analyst_feed_v1';
const FOLLOWS_KEY  = 'soso_following_v1';

// ─── Seed data (makes the feed look alive on first visit) ─────────────────────
const SEED: FeedEntry[] = [
  {
    id: 'seed-1',
    analystAddress: '0x3a9d...c42f',
    type: 'asset_deep_dive',
    label: 'BTC',
    signal: 'BULLISH',
    confidence: 82,
    title: 'Bitcoin ETF Inflows Signal Institutional Accumulation Phase',
    executiveSummary: 'Seven consecutive days of positive BTC ETF inflows totalling $2.1B suggest institutional demand is absorbing sell-side pressure. On-chain data confirms long-term holder supply at multi-year highs.',
    priceAtPublish: 64200,
    symbol: 'BTC',
    targetSymbol: 'vBTC_vUSDC',
    publishedAt: new Date(Date.now() - 80 * 3600_000).toISOString(),
    outcome: 'HIT',
    priceAt72h: 67450,
    priceChangePct: 5.06,
  },
  {
    id: 'seed-2',
    analystAddress: '0x7f2a...91bb',
    type: 'theme_report',
    label: 'AI Tokens',
    signal: 'BULLISH',
    confidence: 71,
    title: 'AI Agent Token Rotation: NEAR, TAO, FET Lead Sector Breakout',
    executiveSummary: 'Sector spotlight data shows AI tokens outperforming broader market by 14% over 7 days. Narrative catalysts from major AI lab announcements continue to drive retail inflows.',
    publishedAt: new Date(Date.now() - 120 * 3600_000).toISOString(),
    outcome: 'HIT',
    priceChangePct: 8.3,
  },
  {
    id: 'seed-3',
    analystAddress: '0x1c8e...55da',
    type: 'asset_deep_dive',
    label: 'ETH',
    signal: 'NEUTRAL',
    confidence: 58,
    title: 'Ethereum Staking Yield Compression Warrants Cautious Positioning',
    executiveSummary: 'ETH staking APY has compressed to 3.2% as validator set grows, reducing yield-seeking demand. Upcoming EIP activity may re-catalyse fee burn narrative but execution risk remains.',
    priceAtPublish: 3420,
    symbol: 'ETH',
    targetSymbol: 'vETH_vUSDC',
    publishedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
    outcome: 'PENDING',
  },
  {
    id: 'seed-4',
    analystAddress: '0x9b3c...7e01',
    type: 'daily_brief',
    label: 'Daily Brief',
    signal: 'BEARISH',
    confidence: 65,
    title: 'Macro Headwinds Override Crypto Momentum: Fed Minutes Dampen Risk Appetite',
    executiveSummary: 'FOMC minutes revealed hawkish undertones with two board members pushing for additional tightening. DXY strengthening and equity futures pointing lower create unfavourable conditions for digital assets near term.',
    publishedAt: new Date(Date.now() - 36 * 3600_000).toISOString(),
    outcome: 'MISS',
    priceChangePct: 2.1,
  },
  {
    id: 'seed-5',
    analystAddress: '0x3a9d...c42f',
    type: 'asset_deep_dive',
    label: 'SOL',
    signal: 'BULLISH',
    confidence: 77,
    title: 'Solana DEX Volume Surges 40% WoW — Network Fees Signal Demand Recovery',
    executiveSummary: 'SoSoValue kline data shows SOL breaking above 60-day resistance at $152 with $820M daily DEX volume. Fee market revival and Firedancer client progress are primary catalysts.',
    priceAtPublish: 148,
    symbol: 'SOL',
    targetSymbol: 'vSOL_vUSDC',
    publishedAt: new Date(Date.now() - 18 * 3600_000).toISOString(),
    outcome: 'PENDING',
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function loadFeed(): FeedEntry[] {
  const seed = SEED;
  if (typeof window === 'undefined') return seed;
  try {
    const local: FeedEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    // Merge: user entries first, then seed (deduplicated by id)
    const ids = new Set(local.map(e => e.id));
    return [...local, ...seed.filter(s => !ids.has(s.id))];
  } catch {
    return seed;
  }
}

export function publishEntry(entry: Omit<FeedEntry, 'id' | 'outcome'>): FeedEntry {
  const full: FeedEntry = { ...entry, id: crypto.randomUUID(), outcome: 'PENDING' };
  try {
    const local: FeedEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    local.unshift(full);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local.slice(0, 100)));
  } catch {}
  return full;
}

export function loadFollowing(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(FOLLOWS_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function toggleFollow(address: string): boolean {
  const following = loadFollowing();
  if (following.has(address)) {
    following.delete(address);
  } else {
    following.add(address);
  }
  try {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify([...following]));
  } catch {}
  return following.has(address);
}

export async function scoreEntry72h(entry: FeedEntry): Promise<FeedEntry> {
  if (!entry.priceAtPublish || !entry.targetSymbol || entry.signal === 'NEUTRAL') {
    return { ...entry, outcome: 'PENDING' };
  }
  const ageHours = (Date.now() - new Date(entry.publishedAt).getTime()) / 3_600_000;
  if (ageHours < 72) return { ...entry, outcome: 'PENDING' };

  try {
    const res = await fetch(
      `/api/sodex?path=/markets/${entry.targetSymbol}/klines&interval=1h&limit=72`
    );
    const json = await res.json();
    const klines: { close: string }[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    if (klines.length === 0) return { ...entry, outcome: 'PENDING' };

    const closeAt72h = parseFloat(klines[klines.length - 1].close);
    const priceChangePct = ((closeAt72h - entry.priceAtPublish) / entry.priceAtPublish) * 100;
    let outcome: 'HIT' | 'MISS';
    if (entry.signal === 'BULLISH') outcome = priceChangePct > 0 ? 'HIT' : 'MISS';
    else outcome = priceChangePct < 0 ? 'HIT' : 'MISS';

    return { ...entry, priceAt72h: closeAt72h, priceChangePct, outcome };
  } catch {
    return { ...entry, outcome: 'PENDING' };
  }
}
