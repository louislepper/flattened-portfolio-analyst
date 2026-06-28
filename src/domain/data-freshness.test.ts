import { describe, it, expect } from 'vitest';
import { computeDataFreshness } from './data-freshness';
import type { SecurityResponse } from '../api/types';

function etf(
  ticker: string,
  refreshedAt: string,
  composites: ReadonlyArray<{ ticker: string; refreshedAt: string }>,
): SecurityResponse {
  return {
    ticker,
    isin: null,
    type: 'etf',
    price: 10000,
    tags: [],
    refreshedAt,
    compositeSecurities: composites.map((c) => ({
      ticker: c.ticker,
      isin: null,
      percentage: 0.5,
      refreshedAt: c.refreshedAt,
    })),
  };
}

function stock(ticker: string, refreshedAt: string): SecurityResponse {
  return {
    ticker,
    isin: null,
    type: 'stock',
    price: 5000,
    tags: [],
    refreshedAt,
    compositeSecurities: [],
  };
}

describe('computeDataFreshness', () => {
  it('returns nulls when there is no data', () => {
    const result = computeDataFreshness(new Map(), new Map());
    expect(result.priceAsOf).toBeNull();
    expect(result.compositionAsOf).toBeNull();
  });

  it('takes the most recent price refresh across all sources', () => {
    const securityData = new Map<string, SecurityResponse>([
      ['VTI', etf('VTI', '2026-06-18T00:00:00Z', [
        { ticker: 'AAPL', refreshedAt: '2026-03-31T00:00:00Z' },
      ])],
      ['MSFT', stock('MSFT', '2026-06-20T00:00:00Z')],
    ]);
    const compositeData = new Map<string, SecurityResponse>([
      ['AAPL', stock('AAPL', '2026-06-19T00:00:00Z')],
    ]);

    const result = computeDataFreshness(securityData, compositeData);
    expect(result.priceAsOf?.toISOString()).toBe(
      '2026-06-20T00:00:00.000Z',
    );
  });

  it('takes the oldest ETF composition date across funds', () => {
    const securityData = new Map<string, SecurityResponse>([
      ['VTI', etf('VTI', '2026-06-20T00:00:00Z', [
        { ticker: 'AAPL', refreshedAt: '2026-03-31T00:00:00Z' },
      ])],
      ['QQQ', etf('QQQ', '2026-06-20T00:00:00Z', [
        { ticker: 'NVDA', refreshedAt: '2025-12-31T00:00:00Z' },
      ])],
    ]);

    const result = computeDataFreshness(securityData, new Map());
    expect(result.compositionAsOf?.toISOString()).toBe(
      '2025-12-31T00:00:00.000Z',
    );
  });

  it('ignores composition dates from non-ETF securities', () => {
    const securityData = new Map<string, SecurityResponse>([
      ['MSFT', stock('MSFT', '2026-06-20T00:00:00Z')],
    ]);

    const result = computeDataFreshness(securityData, new Map());
    expect(result.compositionAsOf).toBeNull();
    expect(result.priceAsOf?.toISOString()).toBe(
      '2026-06-20T00:00:00.000Z',
    );
  });

  it('skips invalid date strings', () => {
    const securityData = new Map<string, SecurityResponse>([
      ['MSFT', stock('MSFT', 'not-a-date')],
    ]);

    const result = computeDataFreshness(securityData, new Map());
    expect(result.priceAsOf).toBeNull();
  });
});
