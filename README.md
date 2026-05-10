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

    subgraph Proxy["Next.js API Layer (server-side)"]
        PS[/api/sosovalue\nproxy + auth]
        PD[/api/sodex\nproxy]
        PG[/api/generate-report\nClaude synthesis]
    end

    subgraph External["External APIs"]
        SV["SoSoValue Terminal\nopenapi.sosovalue.com\n/news /etfs /indices\n/macro /currencies"]
        SD["SoDEX Spot\nmainnet-gw.sodex.dev\n/markets/tickers\n/markets/{sym}/klines"]
        AI["Anthropic Claude\nclaude-sonnet-4-6\nReportInput → GeneratedReport\nsignal + sections + trade idea"]
    end

    Browser -->|API calls| Proxy
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
        B1[SoSoValue /news/hot\n→ 12 articles]
        B2[SoSoValue /etfs/summary-history\n?symbol=BTC&country_code=US\n→ total_net_inflow, date]
        B3[SoSoValue /indices\n→ string ticker list\n+ /market-snapshot ×4]
        B4[SoSoValue /macro/events\n→ event, impact, actual]
    end

    B --> C

    subgraph C["Build ReportInput"]
        C1["type: daily_brief\nnews[] ← id, title, release_time, content\netfFlows ← total_net_inflow, total_net_assets\nindices[] ← price, change_pct_24h\nmacroEvents[] ← event, impact, actual"]
    end

    C --> D

    subgraph D["POST /api/generate-report → Claude Sonnet 4.6"]
        D1["Output: GeneratedReport\n├ signal: BULLISH / BEARISH / NEUTRAL\n├ confidence: 0–100\n├ executiveSummary\n├ sections[]\n├ keyRisks[]\n├ actionableInsight\n├ tradeIdea: asset, direction, targetSymbol\n└ citations[]"]
    end

    D --> E[ReportView component]
    E --> F

    subgraph F["Trade Gate"]
        F1["Show: direction, symbol, rationale\nRequire: risk checkbox ✓\nOn confirm: open SoDEX at target pair"]
    end
```

---

### Asset Deep Dive Flow

```mermaid
flowchart TD
    A([User selects asset\nBTC / ETH / SOL / custom ID]) --> B

    subgraph B["Parallel Data Fetch — Promise.all"]
        B1[/news?category=SYMBOL\n→ filtered news]
        B2[/currencies/{id}/market-snapshot\n→ price, volume, marketCap, change24h]
        B3[/currencies/{id}/klines?interval=1d\n→ OHLCV 30 days]
        B4[/etfs/summary-history?symbol=BTC\n→ macro ETF context]
    end

    B --> C["Build ReportInput\ntype: asset_deep_dive\nasset: BTC | ETH | SOL | ..."]
    C --> D[Claude Sonnet → GeneratedReport]
    D --> E[ReportView + Trade Gate → SoDEX]
```

---

### Theme Report Flow

```mermaid
flowchart TD
    A([User selects theme\nAI Tokens / RWA / DeFi / L1 / custom]) --> B

    subgraph B["Parallel Data Fetch — Promise.all"]
        B1[/news/featured\n→ filtered by theme categories]
        B2[/etfs/summary-history?symbol=BTC\n→ flow context]
        B3[/currencies/sector-spotlight\n→ sector name + change_pct]
        B4[/indices → ticker list\n+ /market-snapshot ×4]
    end

    B --> C["Build ReportInput\ntype: theme_report\ntheme: AI Tokens | RWA | DeFi | ..."]
    C --> D[Claude Sonnet → GeneratedReport]
    D --> E[ReportView + Trade Gate → SoDEX]
```

---

### API Proxy Security Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js Server
    participant S as SoSoValue API

    B->>N: GET /api/sosovalue?path=/news/hot
    Note over N: API key stored in env only
    N->>S: GET openapi.sosovalue.com/openapi/v1/news/hot<br/>x-soso-api-key: ••••••••
    S-->>N: { code: 0, data: { list: [...] } }
    N-->>B: JSON response<br/>(key never reaches browser)
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
git clone <repo>
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

