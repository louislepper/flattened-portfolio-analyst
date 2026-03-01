import { describe, it, expect } from 'vitest';
import { flattenPortfolio } from './aggregation';
import type { SecurityResponse } from '../api/types';
import type { Holding } from './types';

function makeResponse(
  overrides: Partial<SecurityResponse> & { ticker: string },
): SecurityResponse {
  return {
    tags: [],
    price: 0,
    compositeSecurities: [],
    refreshedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('flattenPortfolio', () => {
  it(
    'test case 1: all same price',
    () => {
      const holdings: Holding[] = [
        { ticker: 'GOOG', quantity: 10 },
        { ticker: 'ETF', quantity: 5 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['GOOG', makeResponse({
          ticker: 'GOOG',
          price: 10000,
        })],
        ['ETF', makeResponse({
          ticker: 'ETF',
          price: 10000,
          compositeSecurities: [
            {
              ticker: 'GOOG',
              tags: [],
              price: 10000,
              percentage: 0.2,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
            {
              ticker: 'MSFT',
              tags: [],
              price: 10000,
              percentage: 0.8,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
          ],
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      expect(result).toHaveLength(2);

      const goog = result.find((r) => r.ticker === 'GOOG')!;
      expect(goog.effectiveShares).toBeCloseTo(11);
      expect(goog.totalValueCents).toBeCloseTo(110000);
      expect(goog.percentage).toBeCloseTo(0.733, 2);

      const msft = result.find((r) => r.ticker === 'MSFT')!;
      expect(msft.effectiveShares).toBeCloseTo(4);
      expect(msft.totalValueCents).toBeCloseTo(40000);
      expect(msft.percentage).toBeCloseTo(0.267, 2);

      expect(result[0].ticker).toBe('GOOG');
    },
  );

  it(
    'test case 2: different prices',
    () => {
      const holdings: Holding[] = [
        { ticker: 'GOOG', quantity: 10 },
        { ticker: 'ETF', quantity: 5 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['GOOG', makeResponse({
          ticker: 'GOOG',
          price: 15000,
        })],
        ['ETF', makeResponse({
          ticker: 'ETF',
          price: 50000,
          compositeSecurities: [
            {
              ticker: 'GOOG',
              tags: [],
              price: 15000,
              percentage: 0.2,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
            {
              ticker: 'MSFT',
              tags: [],
              price: 40000,
              percentage: 0.8,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
          ],
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      expect(result).toHaveLength(2);

      const goog = result.find((r) => r.ticker === 'GOOG')!;
      expect(goog.effectiveShares).toBeCloseTo(13.333, 2);
      expect(goog.totalValueCents).toBeCloseTo(200000);
      expect(goog.percentage).toBeCloseTo(0.5);

      const msft = result.find((r) => r.ticker === 'MSFT')!;
      expect(msft.effectiveShares).toBeCloseTo(5.0);
      expect(msft.totalValueCents).toBeCloseTo(200000);
      expect(msft.percentage).toBeCloseTo(0.5);
    },
  );

  it(
    'test case 3: multiple ETFs sharing underlying',
    () => {
      const holdings: Holding[] = [
        { ticker: 'ETF_A', quantity: 2 },
        { ticker: 'ETF_B', quantity: 3 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['ETF_A', makeResponse({
          ticker: 'ETF_A',
          price: 30000,
          compositeSecurities: [
            {
              ticker: 'GOOG',
              tags: [],
              price: 10000,
              percentage: 0.5,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
            {
              ticker: 'MSFT',
              tags: [],
              price: 20000,
              percentage: 0.5,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
          ],
        })],
        ['ETF_B', makeResponse({
          ticker: 'ETF_B',
          price: 10000,
          compositeSecurities: [
            {
              ticker: 'GOOG',
              tags: [],
              price: 10000,
              percentage: 1.0,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
          ],
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      expect(result).toHaveLength(2);

      const goog = result.find((r) => r.ticker === 'GOOG')!;
      expect(goog.effectiveShares).toBeCloseTo(6.0);
      expect(goog.totalValueCents).toBeCloseTo(60000);
      expect(goog.percentage).toBeCloseTo(0.667, 2);

      const msft = result.find((r) => r.ticker === 'MSFT')!;
      expect(msft.effectiveShares).toBeCloseTo(1.5);
      expect(msft.totalValueCents).toBeCloseTo(30000);
      expect(msft.percentage).toBeCloseTo(0.333, 2);
    },
  );

  it(
    'test case 4: direct + ETF with overlap',
    () => {
      const holdings: Holding[] = [
        { ticker: 'AAPL', quantity: 5 },
        { ticker: 'GOOG', quantity: 10 },
        { ticker: 'ETF', quantity: 3 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['AAPL', makeResponse({
          ticker: 'AAPL',
          price: 20000,
        })],
        ['GOOG', makeResponse({
          ticker: 'GOOG',
          price: 15000,
        })],
        ['ETF', makeResponse({
          ticker: 'ETF',
          price: 25000,
          compositeSecurities: [
            {
              ticker: 'AAPL',
              tags: [],
              price: 20000,
              percentage: 0.4,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
            {
              ticker: 'GOOG',
              tags: [],
              price: 15000,
              percentage: 0.6,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
          ],
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      expect(result).toHaveLength(2);

      const aapl = result.find((r) => r.ticker === 'AAPL')!;
      expect(aapl.effectiveShares).toBeCloseTo(6.5);
      expect(aapl.totalValueCents).toBeCloseTo(130000);
      expect(aapl.percentage).toBeCloseTo(0.4, 1);

      const goog = result.find((r) => r.ticker === 'GOOG')!;
      expect(goog.effectiveShares).toBeCloseTo(13.0);
      expect(goog.totalValueCents).toBeCloseTo(195000);
      expect(goog.percentage).toBeCloseTo(0.6, 1);

      expect(result[0].ticker).toBe('GOOG');
    },
  );

  it(
    'test case 5: only direct holdings',
    () => {
      const holdings: Holding[] = [
        { ticker: 'GOOG', quantity: 10 },
        { ticker: 'AAPL', quantity: 5 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['GOOG', makeResponse({
          ticker: 'GOOG',
          price: 15000,
        })],
        ['AAPL', makeResponse({
          ticker: 'AAPL',
          price: 20000,
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      expect(result).toHaveLength(2);

      const goog = result.find((r) => r.ticker === 'GOOG')!;
      expect(goog.effectiveShares).toBe(10);
      expect(goog.totalValueCents).toBe(150000);
      expect(goog.percentage).toBeCloseTo(0.6);

      const aapl = result.find((r) => r.ticker === 'AAPL')!;
      expect(aapl.effectiveShares).toBe(5);
      expect(aapl.totalValueCents).toBe(100000);
      expect(aapl.percentage).toBeCloseTo(0.4);
    },
  );

  it(
    'test case 6: single ETF with one underlying',
    () => {
      const holdings: Holding[] = [
        { ticker: 'ETF', quantity: 4 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['ETF', makeResponse({
          ticker: 'ETF',
          price: 30000,
          compositeSecurities: [
            {
              ticker: 'GOOG',
              tags: [],
              price: 15000,
              percentage: 1.0,
              refreshedAt: '2026-03-01T00:00:00Z',
            },
          ],
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('GOOG');
      expect(result[0].effectiveShares).toBeCloseTo(8.0);
      expect(result[0].totalValueCents).toBeCloseTo(120000);
      expect(result[0].percentage).toBeCloseTo(1.0);
    },
  );

  it('tracks components for debugging', () => {
    const holdings: Holding[] = [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'ETF', quantity: 5 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['GOOG', makeResponse({
        ticker: 'GOOG',
        price: 10000,
      })],
      ['ETF', makeResponse({
        ticker: 'ETF',
        price: 10000,
        compositeSecurities: [
          {
            ticker: 'GOOG',
            tags: [],
            price: 10000,
            percentage: 0.2,
            refreshedAt: '2026-03-01T00:00:00Z',
          },
          {
            ticker: 'MSFT',
            tags: [],
            price: 10000,
            percentage: 0.8,
            refreshedAt: '2026-03-01T00:00:00Z',
          },
        ],
      })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);
    const goog = result.find((r) => r.ticker === 'GOOG')!;

    expect(goog.components).toHaveLength(2);
    expect(goog.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromTicker: 'GOOG',
          effectiveShares: 10,
        }),
        expect.objectContaining({
          fromTicker: 'ETF',
          effectiveShares: 1,
        }),
      ]),
    );
  });

  it('returns empty array for empty holdings', () => {
    const result = flattenPortfolio([], new Map());
    expect(result).toEqual([]);
  });

  it('skips holdings with missing security data', () => {
    const holdings: Holding[] = [
      { ticker: 'UNKNOWN', quantity: 10 },
    ];
    const result = flattenPortfolio(holdings, new Map());
    expect(result).toEqual([]);
  });
});
