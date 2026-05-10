# SoSo Analyst

**Autonomous On-Chain Research Agency** — Built for the SoSoValue Buildathon Wave 1

> Institutional-quality crypto research powered by SoSoValue Terminal, Claude AI, and executed on SoDEX.

## What It Does

SoSo Analyst is the first on-chain financial **research agency** built on SoSoValue's infrastructure. While every other hackathon submission builds a trading bot, SoSo Analyst builds the **research layer** — the Bloomberg for on-chain finance.

| Feature | Description |
|---|---|
| **Daily Market Brief** | Auto-generated from SoSoValue `/news/hot`, `/etfs/summary-history`, `/indices`, `/macro/events` |
| **Asset Deep Dive** | Full research report on any token via `/currencies/{id}/market-snapshot`, `/klines`, `/news` |
| **Theme Reports** | Narrative-driven sector research from `/news/featured`, `/sector-spotlight`, ETF flows |
| **SoDEX Integration** | Live market prices, order book, and one-click trade execution with confirmation gate |
| **AI Signal Layer** | Claude Sonnet generates BULLISH / BEARISH / NEUTRAL signal with confidence score |

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                            │
│                                                                     │
│   Landing Page   Dashboard   Daily Brief   Asset Dive   Theme       │
└────────┬─────────────┬────────────┬────────────┬──────────┬─────────┘
         │             │            │            │          │
         ▼             ▼            └─────┬──────┘          │
┌─────────────────────────────────────────▼──────────────────▼───────┐
│                    NEXT.JS API LAYER  (server-side)                 │
│                                                                     │
│   /api/sosovalue        /api/sodex        /api/generate-report      │
│   (proxy + auth)        (proxy)           (Claude synthesis)        │
└────────┬──────────────────┬──────────────────┬─────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────────┐
│ SoSoValue API  │ │   SoDEX API    │ │  Anthropic Claude  │
│ openapi.soso.. │ │ mainnet-gw..   │ │  claude-sonnet-4-6 │
│                │ │                │ │                    │
│ /news/hot      │ │ /markets/      │ │  ReportInput  →    │
│ /etfs/summary  │ │   tickers      │ │  GeneratedReport   │
│ /indices       │ │ /markets/      │ │                    │
│ /macro/events  │ │   {sym}/klines │ │  signal + sections │
│ /currencies/   │ │ /markets/      │ │  risks + trade idea│
│   {id}/snap    │ │   {sym}/book   │ │                    │
└────────────────┘ └────────────────┘ └────────────────────┘
```

---

### Daily Market Brief Flow

```
User clicks "Generate Daily Brief"
         │
         ▼
┌────────────────────────────────────────────┐
│  PARALLEL DATA FETCH  (Promise.all)        │
│                                            │
│  SoSoValue /news/hot        → 12 articles │
│  SoSoValue /etfs/summary    → BTC flows   │
│            ?symbol=BTC                     │
│            &country_code=US                │
│  SoSoValue /indices         → ticker[]    │
│    └─► /indices/{t}/market-snapshot ×4    │
│  SoSoValue /macro/events    → events      │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│  BUILD ReportInput                         │
│                                            │
│  type: "daily_brief"                       │
│  news[]        ← /news/hot (id,title,      │
│                   release_time, content)   │
│  etfFlows      ← total_net_inflow,         │
│                   total_net_assets, date   │
│  indices[]     ← price, change_pct_24h    │
│  macroEvents[] ← event, impact, actual    │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│  POST /api/generate-report                 │
│  Claude Sonnet 4.6                         │
│                                            │
│  Prompt: live data context block           │
│  Output: GeneratedReport JSON              │
│    ├─ title, subtitle                      │
│    ├─ signal: BULLISH/BEARISH/NEUTRAL      │
│    ├─ confidence: 0–100                    │
│    ├─ executiveSummary                     │
│    ├─ sections[] (heading + content)       │
│    ├─ keyRisks[]                           │
│    ├─ actionableInsight                    │
│    ├─ tradeIdea (asset, direction,         │
│    │             targetSymbol)             │
│    └─ citations[]                          │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
         ReportView component
                   │
                   ▼
┌────────────────────────────────────────────┐
│  TRADE GATE  (if tradeIdea present)        │
│                                            │
│  Show: direction, symbol, rationale        │
│  Require: risk checkbox ✓                  │
│  On confirm: open SoDEX at target pair     │
└────────────────────────────────────────────┘
```

---

### Asset Deep Dive Flow

```
User selects asset (BTC / ETH / SOL / custom)
         │
         ▼
┌────────────────────────────────────────────┐
│  PARALLEL DATA FETCH                       │
│                                            │
│  SoSoValue /news                           │
│    ?category={SYMBOL}   → filtered news   │
│  SoSoValue /currencies/{id}               │
│    /market-snapshot     → price, vol,     │
│                           marketCap       │
│  SoSoValue /currencies/{id}               │
│    /klines?interval=1d  → OHLCV 30d      │
│  SoSoValue /etfs/summary                  │
│    ?symbol=BTC          → macro context  │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
         type: "asset_deep_dive"
         asset: "BTC" | "ETH" | ...
                   │
                   ▼
         Claude Sonnet → GeneratedReport
                   │
                   ▼
         ReportView + Trade Gate
```

---

### Theme Report Flow

```
User selects theme  (AI Tokens / RWA / DeFi / L1 / etc.)
         │
         ▼
┌────────────────────────────────────────────┐
│  PARALLEL DATA FETCH                       │
│                                            │
│  SoSoValue /news/featured  → top stories  │
│    └─ filtered by theme categories        │
│  SoSoValue /etfs/summary   → flow context │
│  SoSoValue /currencies     → sector data  │
│    /sector-spotlight                       │
│  SoSoValue /indices        → SSI perf.   │
│    └─ /market-snapshot ×4                 │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
         type: "theme_report"
         theme: "AI Tokens" | "RWA" | ...
                   │
                   ▼
         Claude Sonnet → GeneratedReport
                   │
                   ▼
         ReportView + Trade Gate
```

---

### API Proxy Design (Security)

```
Browser                Next.js Server              External API
  │                         │                           │
  │  GET /api/sosovalue     │                           │
  │  ?path=/news/hot        │                           │
  ├────────────────────────►│                           │
  │                         │  GET openapi.sosovalue    │
  │                         │  .com/openapi/v1/news/hot │
  │                         │  x-soso-api-key: ****     │
  │                         ├──────────────────────────►│
  │                         │                           │
  │                         │◄──────────────────────────┤
  │                         │  { code:0, data:{...} }   │
  │◄────────────────────────┤                           │
  │  JSON response          │                           │
  │  (key never exposed)    │                           │
```

## SoSoValue API Endpoints Used

- `GET /news/hot` — Hot news for landing page and daily brief
- `GET /news/featured` — Featured news for theme reports
- `GET /news?category={symbol}` — Asset-specific news for deep dives
- `GET /etfs/summary-history` — ETF aggregate flows (BTC + ETH)
- `GET /currencies/{id}/market-snapshot` — Real-time price, volume, market cap
- `GET /currencies/{id}/klines` — Historical OHLCV data
- `GET /currencies/sector-spotlight` — Sector performance data
- `GET /indices` — SSI index list
- `GET /macro/events` — Macro economic events

## SoDEX API Endpoints Used

- `GET /markets/tickers` — Live price tickers (displayed in header strip)
- `GET /markets/{symbol}/orderbook` — Order book depth for trade preview
- `GET /markets/{symbol}/klines` — Price chart data

## Setup

```bash
git clone https://github.com/fourWayz/soso-analyst
cd soso-analyst
npm install

# Configure API keys
cp .env.local.example .env.local
# Add your SOSOVALUE_API_KEY and ANTHROPIC_API_KEY

npm run dev
# Open http://localhost:3000
```

## Environment Variables

```env
SOSOVALUE_API_KEY=      # SoSoValue Terminal API key
ANTHROPIC_API_KEY=      # Anthropic API key (claude-sonnet-4-6)
```

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS (dark Bloomberg-style UI)
- **AI**: Claude Sonnet 4.6 via Anthropic SDK
- **Data**: SoSoValue Terminal API (primary), SoDEX Spot API
- **Deployment**: Vercel

## Wave 1 Deliverables

- [x] Concept validated: on-chain research agency (unique category vs all other submissions)
- [x] SoSoValue API integrated: 9+ endpoints across news, ETF, indices, currencies, macro
- [x] SoDEX API integrated: tickers, order book, klines
- [x] Claude AI report engine: Daily Brief, Asset Deep Dive, Theme Report
- [x] Trade gate: confirmation-gated SoDEX order flow
- [x] Live dashboard: ETF flows, SSI indices, news feed, market prices
- [x] Deployed to Vercel

## Project Overview

**Target users**: Crypto traders, DeFi participants, and on-chain investors who need institutional-quality research but don't have Bloomberg Terminal access or a research team.

**Core logic**: SoSoValue data ingestion → Claude AI synthesis → Structured research report → SoDEX execution gate

**APIs used**: SoSoValue Terminal (news, ETF, indices, macro, currencies), SoDEX Spot (tickers, orderbook), Anthropic (Claude Sonnet 4.6)

**Unique value**: Every other submission produces trade signals. SoSo Analyst produces *research* — the reasoning behind the signal, with citations, risk factors, and a complete narrative. This is the Bloomberg, not the Reuters ticker.

