import type { SecurityResponse } from '../api/types';

const REFRESHED_AT = '2026-03-01T00:00:00Z';

export const MOCK_SECURITIES: Record<string, SecurityResponse> = {
  GOOG: {
    ticker: 'GOOG',
    isin: null,
    type: 'stock',
    price: 15000,
    refreshedAt: REFRESHED_AT,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
      {
        key: 'sector',
        name: 'Sector',
        value: 'Technology',
      },
    ],
    compositeSecurities: [],
  },
  MSFT: {
    ticker: 'MSFT',
    isin: null,
    type: 'stock',
    price: 40000,
    refreshedAt: REFRESHED_AT,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
      {
        key: 'sector',
        name: 'Sector',
        value: 'Technology',
      },
    ],
    compositeSecurities: [],
  },
  AAPL: {
    ticker: 'AAPL',
    isin: null,
    type: 'stock',
    price: 20000,
    refreshedAt: REFRESHED_AT,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
      {
        key: 'sector',
        name: 'Sector',
        value: 'Technology',
      },
    ],
    compositeSecurities: [],
  },
  JPM: {
    ticker: 'JPM',
    isin: null,
    type: 'stock',
    price: 18000,
    refreshedAt: REFRESHED_AT,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
      {
        key: 'sector',
        name: 'Sector',
        value: 'Finance',
      },
    ],
    compositeSecurities: [],
  },
  TECH_ETF: {
    ticker: 'TECH_ETF',
    isin: null,
    type: 'etf',
    price: 50000,
    refreshedAt: REFRESHED_AT,
    tags: [
      {
        key: 'sector',
        name: 'Sector',
        value: 'Technology',
      },
    ],
    compositeSecurities: [
      {
        ticker: 'GOOG',
        isin: null,
        percentage: 0.4,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'MSFT',
        isin: null,
        percentage: 0.35,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'AAPL',
        isin: null,
        percentage: 0.25,
        refreshedAt: REFRESHED_AT,
      },
    ],
  },
  BALANCED_ETF: {
    ticker: 'BALANCED_ETF',
    isin: null,
    type: 'etf',
    price: 30000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [
      {
        ticker: 'GOOG',
        isin: null,
        percentage: 0.3,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'JPM',
        isin: null,
        percentage: 0.7,
        refreshedAt: REFRESHED_AT,
      },
    ],
  },
  PARTIAL_ETF: {
    ticker: 'PARTIAL_ETF',
    isin: null,
    type: 'etf',
    price: 40000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [
      {
        ticker: 'GOOG',
        isin: null,
        percentage: 0.4,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'AAPL',
        isin: null,
        percentage: 0.2,
        refreshedAt: REFRESHED_AT,
      },
    ],
  },
  MYSTERY_ETF: {
    ticker: 'MYSTERY_ETF',
    isin: null,
    type: 'etf',
    price: 25000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [],
  },
  // AT&T: its ticker collides with the raw provider ticker of US Treasuries.
  T: {
    ticker: 'T',
    isin: null,
    type: 'stock',
    price: 2200,
    refreshedAt: REFRESHED_AT,
    tags: [
      {
        key: 'sector',
        name: 'Sector',
        value: 'Communication Services',
      },
    ],
    compositeSecurities: [],
  },
  // Answers slowly, so the dev server shows constituent loading in progress.
  SLOWCO: {
    ticker: 'SLOWCO',
    isin: null,
    type: 'stock',
    price: 1000,
    refreshedAt: REFRESHED_AT,
    tags: [
      {
        key: 'sector',
        name: 'Sector',
        value: 'Industrials',
      },
    ],
    compositeSecurities: [],
  },
  // A bond fund as the pipeline now writes it: non-equity and unresolved
  // constituents keep the provider's raw ticker ("T" is Treasuries here).
  BOND_ETF: {
    ticker: 'BOND_ETF',
    isin: null,
    type: 'etf',
    price: 10000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [
      {
        ticker: 'T',
        isin: 'US912828YK04',
        percentage: 0.6,
        refreshedAt: REFRESHED_AT,
        kind: 'non-equity',
      },
      {
        ticker: 'B',
        isin: 'US912797GL55',
        percentage: 0.2,
        refreshedAt: REFRESHED_AT,
        kind: 'non-equity',
      },
      {
        ticker: 'AAPL',
        isin: 'US0378331005',
        percentage: 0.1,
        refreshedAt: REFRESHED_AT,
        kind: 'equity',
      },
      {
        ticker: 'XS1234567890',
        isin: null,
        percentage: 0.1,
        refreshedAt: REFRESHED_AT,
        kind: 'unresolved',
      },
    ],
  },
  // A doc written before constituents carried a kind, with the placeholder
  // and non-ticker strings legacy docs contain, a ticker with no doc
  // (MISSINGCO), one whose lookup keeps failing (FLAKYCO) and a slow one.
  LEGACY_ETF: {
    ticker: 'LEGACY_ETF',
    isin: null,
    type: 'etf',
    price: 20000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [
      {
        ticker: 'GOOG',
        isin: null,
        percentage: 0.4,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'SLOWCO',
        isin: null,
        percentage: 0.2,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'MISSINGCO',
        isin: null,
        percentage: 0.1,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'FLAKYCO',
        isin: null,
        percentage: 0.1,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'UNKNOWN',
        isin: null,
        percentage: 0.1,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'CASH USD',
        isin: null,
        percentage: 0.1,
        refreshedAt: REFRESHED_AT,
      },
    ],
  },
};
