import type { SecurityResponse } from '../api/types';

const REFRESHED_AT = '2026-03-01T00:00:00Z';

export const MOCK_SECURITIES: Record<string, SecurityResponse> = {
  GOOG: {
    ticker: 'GOOG',
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
        percentage: 0.4,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'MSFT',
        percentage: 0.35,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'AAPL',
        percentage: 0.25,
        refreshedAt: REFRESHED_AT,
      },
    ],
  },
  BALANCED_ETF: {
    ticker: 'BALANCED_ETF',
    type: 'etf',
    price: 30000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [
      {
        ticker: 'GOOG',
        percentage: 0.3,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'JPM',
        percentage: 0.7,
        refreshedAt: REFRESHED_AT,
      },
    ],
  },
  PARTIAL_ETF: {
    ticker: 'PARTIAL_ETF',
    type: 'etf',
    price: 40000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [
      {
        ticker: 'GOOG',
        percentage: 0.4,
        refreshedAt: REFRESHED_AT,
      },
      {
        ticker: 'AAPL',
        percentage: 0.2,
        refreshedAt: REFRESHED_AT,
      },
    ],
  },
  MYSTERY_ETF: {
    ticker: 'MYSTERY_ETF',
    type: 'etf',
    price: 25000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [],
  },
};
