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

```mermaid
graph TD
    subgraph Browser["Browser / Client"]
        LP[Landing Page]
        DB[Dashboard]
        DR[Daily Brief]
        AD[Asset Dive]
        TR[Theme Report]
    end

    subgraph Proxy["Next.js API Layer — server-side"]
        PS["/api/sosovalue — proxy + auth"]
        PD["/api/sodex — proxy"]
        PG["/api/generate-report — Claude"]
    end

    subgraph SV["SoSoValue Terminal"]
        SV1["/news  /etfs  /indices"]
        SV2["/macro  /currencies"]
    end

    subgraph SD["SoDEX Spot API"]
        SD1["/markets/tickers"]
        SD2["/markets/symbol/klines"]
    end

    subgraph AI["Anthropic Claude"]
        AI1["claude-sonnet-4-6"]
        AI2["ReportInput → GeneratedReport"]
    end

    Browser -->|fetch| Proxy
    PS --> SV
    PD --> SD
    PG --> AI
```

---

### Daily Market Brief Flow

```mermaid
flowchart TD
    A([User clicks Generate Daily Brief]) --> B

    subgraph B["Parallel Data Fetch — Promise.all"]
        B1["/news/hot — 12 articles"]
        B2["/etfs/summary-history — BTC net inflow + date"]
        B3["/indices — SSI ticker list + snapshots x4"]
        B4["/macro/events — event, impact, actual"]
    end

    B --> C

    subgraph C["Build ReportInput"]
        C1["type: daily_brief"]
        C2["news — title, release_time, content"]
        C3["etfFlows — total_net_inflow, total_net_assets"]
        C4["indices — price, change_pct_24h"]
        C5["macroEvents — event, impact, actual"]
    end

    C --> D

    subgraph D["POST /api/generate-report — Claude Sonnet 4.6"]
        D1["signal: BULLISH / BEARISH / NEUTRAL"]
        D2["confidence: 0–100"]
        D3["executiveSummary, sections, keyRisks"]
        D4["actionableInsight, tradeIdea, citations"]
    end

    D --> E[ReportView component]
    E --> F

    subgraph F["Trade Gate"]
        F1["Show direction + symbol + rationale"]
        F2["Require risk acknowledgement checkbox"]
        F3["Confirm — open SoDEX at target pair"]
    end
```

---

### Asset Deep Dive Flow

```mermaid
flowchart TD
    A([User selects asset — BTC / ETH / SOL / custom]) --> B

    subgraph B["Parallel Data Fetch — Promise.all"]
        B1["/news?category=SYMBOL — filtered news"]
        B2["/currencies/:id/market-snapshot — price, volume, cap"]
        B3["/currencies/:id/klines?interval=1d — 30d OHLCV"]
        B4["/etfs/summary-history?symbol=BTC — ETF context"]
    end

    B --> C["Build ReportInput — type: asset_deep_dive"]
    C --> D["Claude Sonnet — GeneratedReport"]
    D --> E["ReportView + Trade Gate — SoDEX"]
```

---

### Theme Report Flow

```mermaid
flowchart TD
    A([User selects theme — AI / RWA / DeFi / L1 / custom]) --> B

    subgraph B["Parallel Data Fetch — Promise.all"]
        B1["/news/featured — filtered by theme categories"]
        B2["/etfs/summary-history?symbol=BTC — flow context"]
        B3["/currencies/sector-spotlight — sector change_pct"]
        B4["/indices — ticker list + market snapshots x4"]
    end

    B --> C["Build ReportInput — type: theme_report"]
    C --> D["Claude Sonnet — GeneratedReport"]
    D --> E["ReportView + Trade Gate — SoDEX"]
```

---

### API Proxy Security Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js Server
    participant S as SoSoValue API

    B->>N: GET /api/sosovalue?path=/news/hot
    Note over N: API key stored server-side only
    N->>S: GET /openapi/v1/news/hot with x-soso-api-key header
    S-->>N: JSON response with data payload
    N-->>B: Proxied JSON — API key never reaches browser
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

