# [Flattened Portfolio Analyst](https://flattened-portfolio-analyst.wellcutpomelo.com/)

**Are we overindexed on AAPL, NVDA, and MSFT?**

As AI started booming, I started to become concerned about the heavy weighting of the
largest companies in common ETFs. I'm not personally bearish on AI — it's just that my
main motivation in investing in ETFs is to have broad diversification.

The portfolio tools I already had didn't show me what underlying companies I was
investing in or their proportions, so I made a tool.
[Flattened Portfolio Analyst](https://flattened-portfolio-analyst.wellcutpomelo.com/)
takes a CSV of your holdings and produces a flattened view of your underlying
investments — aggregating overlapping ETF holdings. The flattening calculation happens
in the browser. I don't store your holdings CSV.

## An example

If you own 14 shares of VOO (~$10k), 22 shares in QQQ (~$15k), and 3 shares in META
(~$2k), your top 5 holdings would be:

| Ticker | Shares | Value | % |
|--------|--------|-------|-------|
| META | 4.09 | $2432.77 | 9.2% |
| NVDA | 9.68 | $2001.82 | 7.6% |
| AAPL | 5.53 | $1840.78 | 7.0% |
| MSFT | 3.12 | $1190.98 | 4.5% |
| AMZN | 4.35 | $1009.70 | 3.8% |

You can then decide based on your own risk tolerance whether you're comfortable with
your current level of diversification.

## Using it

Paste or upload a CSV with one row per holding:

```csv
ticker,quantity,price
VOO,14
QQQ,22
META,3,712.50
```

- A header row is optional — it's detected and skipped.
- `ticker` and `quantity` are required; a third price column is an optional per-share
  override in USD (otherwise the app looks the price up).
- Duplicate tickers are summed.

You can also add holdings one at a time in the UI. Results are shown as a flattened
allocation list, a pie chart, and a concentration bar, and can be grouped by tags such
as sector or country.

## How it works

- **Frontend** (`src/`) — React + TypeScript + MUI, built with Vite. The domain logic
  lives in `src/domain/`: CSV parsing, ETF flattening/aggregation, tag analysis, and
  data-freshness rules. All of it runs client-side; holdings are never sent anywhere as
  a portfolio.
- **Backend** (`functions/`) — a Firebase Function serving
  `GET /api/v1/securities/:ticker`. It returns security metadata, tags, price, and (for
  ETFs) constituent holdings from Firestore, refreshing stale prices from Finnhub. It's
  a per-ticker lookup API, so it sees tickers, not your portfolio.
- **ETF data** (`etf-data/`, `etf-data-scripts/`) — offline scripts that scrape and
  upload ETF constituent data, security profiles/tags, and prices into Firestore.

Price refreshes are spread probabilistically over a window (see
`functions/src/handler.ts`) so cohorts of securities fetched together don't all expire
at once and stampede the upstream API. App Check gates the API, with its enforcement
mode driven by a LaunchDarkly flag — see [LAUNCHDARKLY.md](LAUNCHDARKLY.md).

## Development

```bash
npm install
cp .env.example .env   # fill in the values you need
npm run dev            # Vite dev server
npm test               # unit tests (Vitest)
npm run lint
npm run storybook      # component workshop
```

`.env.example` documents the frontend Firebase/App Check values and the backend API
secrets. Production secrets live in Firebase Secret Manager, not in the repo.

Deployment runs from GitHub Actions (`.github/workflows/deploy.yml`) to Firebase
Hosting + Functions.

## Caveats

Prices and ETF constituent data are cached and can be days old — this is a
diversification tool, not a live portfolio tracker. Nothing here is financial advice.
