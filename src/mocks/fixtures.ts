import type { SecurityResponse } from '../api/types';

const REFRESHED_AT = '2026-03-01T00:00:00Z';

export const MOCK_SECURITIES: Record<string, SecurityResponse> = {
  GOOG: {
    ticker: 'GOOG',
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
        price: 15000,
        percentage: 0.4,
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
      },
      {
        ticker: 'MSFT',
        price: 40000,
        percentage: 0.35,
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
      },
      {
        ticker: 'AAPL',
        price: 20000,
        percentage: 0.25,
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
      },
    ],
  },
  BALANCED_ETF: {
    ticker: 'BALANCED_ETF',
    price: 30000,
    refreshedAt: REFRESHED_AT,
    tags: [],
    compositeSecurities: [
      {
        ticker: 'GOOG',
        price: 15000,
        percentage: 0.3,
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
      },
      {
        ticker: 'JPM',
        price: 18000,
        percentage: 0.7,
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
      },
    ],
  },
};
