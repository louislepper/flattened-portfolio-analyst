import { describe, it, expect } from 'vitest';
import {
  collectConstituentLookups,
  resolveConstituentKind,
} from './constituents';
import type { CompositeSecurity, SecurityResponse } from '../api/types';

const REFRESHED_AT = '2026-03-01T00:00:00Z';

function composite(
  ticker: string,
  kind?: CompositeSecurity['kind'],
): CompositeSecurity {
  return {
    ticker,
    isin: null,
    percentage: 0.1,
    refreshedAt: REFRESHED_AT,
    ...(kind ? { kind } : {}),
  };
}

function security(
  ticker: string,
  type: SecurityResponse['type'],
  compositeSecurities: CompositeSecurity[] = [],
): SecurityResponse {
  return {
    ticker,
    isin: null,
    type,
    tags: [],
    price: 1000,
    compositeSecurities,
    refreshedAt: REFRESHED_AT,
  };
}

describe('resolveConstituentKind', () => {
  it.each(['equity', 'non-equity', 'unresolved'] as const)(
    'uses an explicit kind of %s as-is',
    (kind) => {
      expect(resolveConstituentKind(composite('T', kind))).toBe(kind);
    },
  );

  it('keeps an explicit kind even for a ticker that looks invalid', () => {
    expect(resolveConstituentKind(composite('CASH USD', 'non-equity')))
      .toBe('non-equity');
    expect(resolveConstituentKind(composite('CASH USD', 'equity')))
      .toBe('equity');
  });

  it.each(['AAPL', 'BRK.B', '005930.KS', 'BP.L', 'RDS-A', 'ab_c', 'goog'])(
    'treats legacy %s (no kind, valid ticker) as equity',
    (ticker) => {
      expect(resolveConstituentKind(composite(ticker))).toBe('equity');
    },
  );

  it.each(['UNKNOWN', 'unknown', 'CASH USD', 'XS 123', '#N/A', '', 'A/B'])(
    'treats legacy "%s" (no kind, not a ticker) as unresolved',
    (ticker) => {
      expect(resolveConstituentKind(composite(ticker))).toBe('unresolved');
    },
  );
});

describe('collectConstituentLookups', () => {
  it('returns only equity constituents of ETFs, deduplicated in order', () => {
    const data = new Map([
      ['GOVI', security('GOVI', 'etf', [
        composite('T', 'non-equity'),
        composite('AAPL', 'equity'),
        composite('XS1', 'unresolved'),
        composite('MSFT'),
        composite('UNKNOWN'),
        composite('CASH USD'),
      ])],
      ['SPY', security('SPY', 'etf', [
        composite('MSFT', 'equity'),
        composite('NVDA', 'equity'),
      ])],
    ]);

    expect(collectConstituentLookups(data)).toEqual(['AAPL', 'MSFT', 'NVDA']);
  });

  it('skips constituents already loaded as user holdings', () => {
    const data = new Map([
      ['AAPL', security('AAPL', 'stock')],
      ['SPY', security('SPY', 'etf', [
        composite('AAPL', 'equity'),
        composite('MSFT', 'equity'),
      ])],
    ]);

    expect(collectConstituentLookups(data)).toEqual(['MSFT']);
  });

  it('ignores composite entries on stocks and returns nothing without ETFs', () => {
    const data = new Map([
      ['ODD', security('ODD', 'stock', [composite('AAPL', 'equity')])],
    ]);

    expect(collectConstituentLookups(data)).toEqual([]);
  });
});
