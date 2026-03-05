import { describe, it, expect } from 'vitest';
import { flattenPortfolio } from './aggregation';
import type { SecurityResponse } from '../api/types';
import type { Holding } from './types';

const REFRESHED_AT = '2026-03-01T00:00:00Z';

function makeStock(
  overrides: Partial<SecurityResponse> & { ticker: string },
): SecurityResponse {
  return {
    type: 'stock',
    tags: [],
    price: 0,
    compositeSecurities: [],
    refreshedAt: REFRESHED_AT,
    ...overrides,
  };
}

function makeEtf(
  overrides: Partial<SecurityResponse> & { ticker: string },
): SecurityResponse {
  return {
    type: 'etf',
    tags: [],
    price: 0,
    compositeSecurities: [],
    refreshedAt: REFRESHED_AT,
    ...overrides,
  };
}

describe('flattenPortfolio', () => {
  it('test case 1: all same price', () => {
    const holdings: Holding[] = [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'ETF', quantity: 5 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['GOOG', makeStock({ ticker: 'GOOG', price: 10000 })],
      ['ETF', makeEtf({
        ticker: 'ETF',
        price: 10000,
        compositeSecurities: [
          {
            ticker: 'GOOG',
            percentage: 0.2, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            percentage: 0.8, refreshedAt: REFRESHED_AT,
          },
        ],
      })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);

    expect(result).toHaveLength(2);

    const goog = result.find((r) => r.ticker === 'GOOG')!;
    expect(goog.shareCount).toBe(10);
    expect(goog.valueCentsFromComponents).toBeCloseTo(10000);
    expect(goog.totalValueCents).toBeCloseTo(110000);
    expect(goog.percentage).toBeCloseTo(0.733, 2);
    expect(goog.price).toBe(10000);
    expect(goog.tagsLoaded).toBe(true);
    expect(goog.isUnknown).toBe(false);

    const msft = result.find((r) => r.ticker === 'MSFT')!;
    expect(msft.shareCount).toBe(0);
    expect(msft.valueCentsFromComponents).toBeCloseTo(40000);
    expect(msft.totalValueCents).toBeCloseTo(40000);
    expect(msft.percentage).toBeCloseTo(0.267, 2);
    expect(msft.price).toBe(null);
    expect(msft.tagsLoaded).toBe(false);
    expect(msft.isUnknown).toBe(false);

    expect(result[0].ticker).toBe('GOOG');
  });

  it('test case 2: different prices', () => {
    const holdings: Holding[] = [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'ETF', quantity: 5 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['GOOG', makeStock({ ticker: 'GOOG', price: 15000 })],
      ['ETF', makeEtf({
        ticker: 'ETF',
        price: 50000,
        compositeSecurities: [
          {
            ticker: 'GOOG',
            percentage: 0.2, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            percentage: 0.8, refreshedAt: REFRESHED_AT,
          },
        ],
      })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);

    expect(result).toHaveLength(2);

    const goog = result.find((r) => r.ticker === 'GOOG')!;
    expect(goog.shareCount).toBe(10);
    expect(goog.valueCentsFromComponents).toBeCloseTo(50000);
    expect(goog.totalValueCents).toBeCloseTo(200000);
    expect(goog.percentage).toBeCloseTo(0.5);

    const msft = result.find((r) => r.ticker === 'MSFT')!;
    expect(msft.shareCount).toBe(0);
    expect(msft.valueCentsFromComponents).toBeCloseTo(200000);
    expect(msft.totalValueCents).toBeCloseTo(200000);
    expect(msft.percentage).toBeCloseTo(0.5);
  });

  it('test case 3: multiple ETFs sharing underlying', () => {
    const holdings: Holding[] = [
      { ticker: 'ETF_A', quantity: 2 },
      { ticker: 'ETF_B', quantity: 3 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['ETF_A', makeEtf({
        ticker: 'ETF_A',
        price: 30000,
        compositeSecurities: [
          {
            ticker: 'GOOG',
            percentage: 0.5, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            percentage: 0.5, refreshedAt: REFRESHED_AT,
          },
        ],
      })],
      ['ETF_B', makeEtf({
        ticker: 'ETF_B',
        price: 10000,
        compositeSecurities: [
          {
            ticker: 'GOOG',
            percentage: 1.0, refreshedAt: REFRESHED_AT,
          },
        ],
      })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);

    expect(result).toHaveLength(2);

    const goog = result.find((r) => r.ticker === 'GOOG')!;
    expect(goog.valueCentsFromComponents).toBeCloseTo(60000);
    expect(goog.totalValueCents).toBeCloseTo(60000);
    expect(goog.percentage).toBeCloseTo(0.667, 2);

    const msft = result.find((r) => r.ticker === 'MSFT')!;
    expect(msft.valueCentsFromComponents).toBeCloseTo(30000);
    expect(msft.totalValueCents).toBeCloseTo(30000);
    expect(msft.percentage).toBeCloseTo(0.333, 2);
  });

  it('test case 4: direct + ETF with overlap', () => {
    const holdings: Holding[] = [
      { ticker: 'AAPL', quantity: 5 },
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'ETF', quantity: 3 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['AAPL', makeStock({ ticker: 'AAPL', price: 20000 })],
      ['GOOG', makeStock({ ticker: 'GOOG', price: 15000 })],
      ['ETF', makeEtf({
        ticker: 'ETF',
        price: 25000,
        compositeSecurities: [
          {
            ticker: 'AAPL',
            percentage: 0.4, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'GOOG',
            percentage: 0.6, refreshedAt: REFRESHED_AT,
          },
        ],
      })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);

    expect(result).toHaveLength(2);

    const aapl = result.find((r) => r.ticker === 'AAPL')!;
    expect(aapl.shareCount).toBe(5);
    expect(aapl.valueCentsFromComponents).toBeCloseTo(30000);
    expect(aapl.totalValueCents).toBeCloseTo(130000);
    expect(aapl.percentage).toBeCloseTo(0.4, 1);

    const goog = result.find((r) => r.ticker === 'GOOG')!;
    expect(goog.shareCount).toBe(10);
    expect(goog.valueCentsFromComponents).toBeCloseTo(45000);
    expect(goog.totalValueCents).toBeCloseTo(195000);
    expect(goog.percentage).toBeCloseTo(0.6, 1);

    expect(result[0].ticker).toBe('GOOG');
  });

  it('test case 5: only direct holdings', () => {
    const holdings: Holding[] = [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'AAPL', quantity: 5 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['GOOG', makeStock({ ticker: 'GOOG', price: 15000 })],
      ['AAPL', makeStock({ ticker: 'AAPL', price: 20000 })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);

    expect(result).toHaveLength(2);

    const goog = result.find((r) => r.ticker === 'GOOG')!;
    expect(goog.shareCount).toBe(10);
    expect(goog.totalValueCents).toBe(150000);
    expect(goog.percentage).toBeCloseTo(0.6);
    expect(goog.price).toBe(15000);
    expect(goog.tagsLoaded).toBe(true);
    expect(goog.isUnknown).toBe(false);

    const aapl = result.find((r) => r.ticker === 'AAPL')!;
    expect(aapl.shareCount).toBe(5);
    expect(aapl.totalValueCents).toBe(100000);
    expect(aapl.percentage).toBeCloseTo(0.4);
  });

  it('test case 6: single ETF with one underlying', () => {
    const holdings: Holding[] = [
      { ticker: 'ETF', quantity: 4 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['ETF', makeEtf({
        ticker: 'ETF',
        price: 30000,
        compositeSecurities: [
          {
            ticker: 'GOOG',
            percentage: 1.0, refreshedAt: REFRESHED_AT,
          },
        ],
      })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);

    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe('GOOG');
    expect(result[0].valueCentsFromComponents)
      .toBeCloseTo(120000);
    expect(result[0].totalValueCents).toBeCloseTo(120000);
    expect(result[0].percentage).toBeCloseTo(1.0);
  });

  it('tracks components for debugging', () => {
    const holdings: Holding[] = [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'ETF', quantity: 5 },
    ];

    const dataMap = new Map<string, SecurityResponse>([
      ['GOOG', makeStock({ ticker: 'GOOG', price: 10000 })],
      ['ETF', makeEtf({
        ticker: 'ETF',
        price: 10000,
        compositeSecurities: [
          {
            ticker: 'GOOG',
            percentage: 0.2, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            percentage: 0.8, refreshedAt: REFRESHED_AT,
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
          valueCents: 100000,
        }),
        expect.objectContaining({
          fromTicker: 'ETF',
          valueCents: 10000,
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

  describe('unknown ETF portions', () => {
    it(
      'creates unknown entry for ETF with partial composites',
      () => {
        const holdings: Holding[] = [
          { ticker: 'PARTIAL', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['PARTIAL', makeEtf({
            ticker: 'PARTIAL',
            price: 40000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 0.4, refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'AAPL',
                percentage: 0.2, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        // 5 * 40000 = 200000 total ETF value
        // GOOG: 200000 * 0.4 = 80000
        // AAPL: 200000 * 0.2 = 40000
        // Unknown: 200000 * 0.4 = 80000
        expect(result).toHaveLength(3);

        const goog = result.find(
          (r) => r.ticker === 'GOOG',
        )!;
        expect(goog.valueCentsFromComponents)
          .toBeCloseTo(80000);
        expect(goog.totalValueCents).toBeCloseTo(80000);
        expect(goog.isUnknown).toBe(false);

        const aapl = result.find(
          (r) => r.ticker === 'AAPL',
        )!;
        expect(aapl.valueCentsFromComponents)
          .toBeCloseTo(40000);
        expect(aapl.totalValueCents).toBeCloseTo(40000);
        expect(aapl.isUnknown).toBe(false);

        const unknown = result.find((r) => r.isUnknown)!;
        expect(unknown.ticker).toBe(
          'Unknown (From PARTIAL)',
        );
        expect(unknown.totalValueCents).toBeCloseTo(80000);
        expect(unknown.shareCount).toBe(0);
        expect(unknown.tags).toEqual([]);
        expect(unknown.tagsLoaded).toBe(true);
        expect(unknown.percentage).toBeCloseTo(0.4);
        expect(unknown.components).toHaveLength(1);
        expect(unknown.components[0].fromTicker)
          .toBe('PARTIAL');
        expect(unknown.components[0].valueCents)
          .toBeCloseTo(80000);
      },
    );

    it(
      'creates 100% unknown for ETF with empty composites',
      () => {
        const holdings: Holding[] = [
          { ticker: 'MYSTERY', quantity: 3 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['MYSTERY', makeEtf({
            ticker: 'MYSTERY',
            price: 25000,
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        // 3 * 25000 = 75000 total, all unknown
        expect(result).toHaveLength(1);
        expect(result[0].ticker).toBe(
          'Unknown (From MYSTERY)',
        );
        expect(result[0].totalValueCents).toBeCloseTo(75000);
        expect(result[0].percentage).toBeCloseTo(1.0);
        expect(result[0].shareCount).toBe(0);
        expect(result[0].isUnknown).toBe(true);
      },
    );

    it(
      'creates separate unknowns for different ETFs',
      () => {
        const holdings: Holding[] = [
          { ticker: 'ETF_A', quantity: 2 },
          { ticker: 'ETF_B', quantity: 1 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['ETF_A', makeEtf({
            ticker: 'ETF_A',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 0.5, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
          ['ETF_B', makeEtf({
            ticker: 'ETF_B',
            price: 20000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 0.3, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        // ETF_A: 2*10000=20000, GOOG=10000, unknown=10000
        // ETF_B: 1*20000=20000, GOOG=6000, unknown=14000
        // GOOG total: 16000
        // Total: 16000 + 10000 + 14000 = 40000
        expect(result).toHaveLength(3);

        const unknownA = result.find(
          (r) => r.ticker === 'Unknown (From ETF_A)',
        )!;
        expect(unknownA.totalValueCents).toBeCloseTo(10000);
        expect(unknownA.isUnknown).toBe(true);

        const unknownB = result.find(
          (r) => r.ticker === 'Unknown (From ETF_B)',
        )!;
        expect(unknownB.totalValueCents).toBeCloseTo(14000);
        expect(unknownB.isUnknown).toBe(true);

        const goog = result.find(
          (r) => r.ticker === 'GOOG',
        )!;
        expect(goog.totalValueCents).toBeCloseTo(16000);
        expect(goog.isUnknown).toBe(false);
      },
    );

    it(
      'accumulates unknown from same ETF held multiple times',
      () => {
        const holdings: Holding[] = [
          { ticker: 'PARTIAL', quantity: 10 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['PARTIAL', makeEtf({
            ticker: 'PARTIAL',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 0.7, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        // 10 * 10000 = 100000 total
        // GOOG: 70000, unknown: 30000
        expect(result).toHaveLength(2);

        const unknown = result.find((r) => r.isUnknown)!;
        expect(unknown.totalValueCents).toBeCloseTo(30000);
        expect(unknown.percentage).toBeCloseTo(0.3);
      },
    );

    it(
      'no unknown entry when composites sum to exactly 100%',
      () => {
        const holdings: Holding[] = [
          { ticker: 'FULL', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['FULL', makeEtf({
            ticker: 'FULL',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 0.6, refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'MSFT',
                percentage: 0.4, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        expect(result).toHaveLength(2);
        expect(
          result.every((r) => !r.isUnknown),
        ).toBe(true);
      },
    );

    it(
      'mixed: direct stocks + ETF with partial composites',
      () => {
        const holdings: Holding[] = [
          { ticker: 'GOOG', quantity: 10 },
          { ticker: 'PARTIAL', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['GOOG', makeStock({
            ticker: 'GOOG',
            price: 10000,
          })],
          ['PARTIAL', makeEtf({
            ticker: 'PARTIAL',
            price: 20000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 0.5, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        // Direct GOOG: 10 * 10000 = 100000
        // ETF: 5 * 20000 = 100000
        //   GOOG: 100000 * 0.5 = 50000
        //   Unknown: 100000 * 0.5 = 50000
        // GOOG total: 100000 + 50000 = 150000
        // Unknown: 50000
        // Total: 200000
        expect(result).toHaveLength(2);

        const goog = result.find(
          (r) => r.ticker === 'GOOG',
        )!;
        expect(goog.shareCount).toBe(10);
        expect(goog.valueCentsFromComponents)
          .toBeCloseTo(50000);
        expect(goog.totalValueCents).toBeCloseTo(150000);
        expect(goog.percentage).toBeCloseTo(0.75);

        const unknown = result.find((r) => r.isUnknown)!;
        expect(unknown.totalValueCents).toBeCloseTo(50000);
        expect(unknown.percentage).toBeCloseTo(0.25);
      },
    );
  });

  describe('compositeDataMap', () => {
    it(
      'uses compositeDataMap for price and tags lookup',
      () => {
        const holdings: Holding[] = [
          { ticker: 'ETF', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['ETF', makeEtf({
            ticker: 'ETF',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 1.0,
                refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const compositeDataMap = new Map<
          string,
          SecurityResponse
        >([
          ['GOOG', makeStock({
            ticker: 'GOOG',
            price: 15000,
            tags: [
              {
                key: 'sector',
                name: 'Sector',
                value: 'Tech',
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(
          holdings,
          dataMap,
          compositeDataMap,
        );

        expect(result).toHaveLength(1);
        const goog = result[0];
        expect(goog.price).toBe(15000);
        expect(goog.tagsLoaded).toBe(true);
        expect(goog.tags).toEqual([
          {
            key: 'sector',
            name: 'Sector',
            value: 'Tech',
          },
        ]);
      },
    );

    it(
      'falls back to securityDataMap when not in compositeDataMap',
      () => {
        const holdings: Holding[] = [
          { ticker: 'ETF', quantity: 5 },
        ];

        const googSecurity = makeStock({
          ticker: 'GOOG',
          price: 15000,
          tags: [
            {
              key: 'sector',
              name: 'Sector',
              value: 'Tech',
            },
          ],
        });

        const dataMap = new Map<string, SecurityResponse>([
          ['ETF', makeEtf({
            ticker: 'ETF',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 1.0,
                refreshedAt: REFRESHED_AT,
              },
            ],
          })],
          ['GOOG', googSecurity],
        ]);

        const result = flattenPortfolio(
          holdings,
          dataMap,
          new Map(),
        );

        expect(result).toHaveLength(1);
        const goog = result[0];
        expect(goog.price).toBe(15000);
        expect(goog.tagsLoaded).toBe(true);
      },
    );

    it(
      'merges composite data with direct holdings',
      () => {
        const holdings: Holding[] = [
          { ticker: 'GOOG', quantity: 10 },
          { ticker: 'ETF', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['GOOG', makeStock({
            ticker: 'GOOG',
            price: 10000,
            tags: [
              {
                key: 'sector',
                name: 'Sector',
                value: 'Tech',
              },
            ],
          })],
          ['ETF', makeEtf({
            ticker: 'ETF',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 1.0,
                refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        expect(result).toHaveLength(1);
        const goog = result[0];
        expect(goog.shareCount).toBe(10);
        expect(goog.valueCentsFromComponents)
          .toBeCloseTo(50000);
        expect(goog.totalValueCents).toBeCloseTo(150000);
        expect(goog.price).toBe(10000);
        expect(goog.tagsLoaded).toBe(true);
      },
    );

    it(
      'shows null price and tagsLoaded=false when no data',
      () => {
        const holdings: Holding[] = [
          { ticker: 'ETF', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['ETF', makeEtf({
            ticker: 'ETF',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 1.0,
                refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        expect(result).toHaveLength(1);
        const goog = result[0];
        expect(goog.price).toBe(null);
        expect(goog.tagsLoaded).toBe(false);
        expect(goog.tags).toEqual([]);
      },
    );
  });

  describe('edge cases: zero prices and NaN/Infinity', () => {
    it(
      'handles composite with no price data gracefully',
      () => {
        const holdings: Holding[] = [
          { ticker: 'ETF', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['ETF', makeEtf({
            ticker: 'ETF',
            price: 10000,
            compositeSecurities: [
              {
                ticker: 'GOOG',
                percentage: 0.5,
                refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'MSFT',
                percentage: 0.5,
                refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        const goog = result.find(
          (r) => r.ticker === 'GOOG',
        );
        expect(goog).toBeDefined();
        expect(goog!.price).toBe(null);
        expect(goog!.totalValueCents).toBeCloseTo(25000);
        expect(Number.isFinite(goog!.percentage)).toBe(true);

        const msft = result.find(
          (r) => r.ticker === 'MSFT',
        );
        expect(msft).toBeDefined();
        expect(msft!.price).toBe(null);
        expect(msft!.totalValueCents).toBeCloseTo(25000);
      },
    );

    it('handles ETF with zero price', () => {
      const holdings: Holding[] = [
        { ticker: 'ETF', quantity: 5 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['ETF', makeEtf({
          ticker: 'ETF',
          price: 0,
          compositeSecurities: [
            {
              ticker: 'GOOG',
              percentage: 0.5, refreshedAt: REFRESHED_AT,
            },
          ],
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);
      expect(result).toEqual([]);
    });

    it('handles direct stock with zero price', () => {
      const holdings: Holding[] = [
        { ticker: 'FREE', quantity: 100 },
        { ticker: 'GOOG', quantity: 5 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['FREE', makeStock({ ticker: 'FREE', price: 0 })],
        ['GOOG', makeStock({
          ticker: 'GOOG',
          price: 10000,
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      expect(result).toHaveLength(2);
      const free = result.find((r) => r.ticker === 'FREE')!;
      expect(free.shareCount).toBe(100);
      expect(free.totalValueCents).toBe(0);
      expect(free.percentage).toBe(0);
      expect(Number.isFinite(free.percentage)).toBe(true);

      const goog = result.find((r) => r.ticker === 'GOOG')!;
      expect(goog.percentage).toBeCloseTo(1.0);
    });

    it(
      'produces no NaN or Infinity in any allocation field',
      () => {
        const holdings: Holding[] = [
          { ticker: 'ETF', quantity: 3 },
          { ticker: 'ZERO_STOCK', quantity: 10 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['ETF', makeEtf({
            ticker: 'ETF',
            price: 20000,
            compositeSecurities: [
              {
                ticker: 'A',
                percentage: 0.3, refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'B',
                percentage: 0.7, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
          ['ZERO_STOCK', makeStock({
            ticker: 'ZERO_STOCK',
            price: 0,
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        for (const alloc of result) {
          expect(Number.isFinite(alloc.shareCount))
            .toBe(true);
          expect(Number.isFinite(alloc.totalValueCents))
            .toBe(true);
          expect(Number.isFinite(alloc.percentage))
            .toBe(true);
          for (const comp of alloc.components) {
            expect(Number.isFinite(comp.valueCents))
              .toBe(true);
          }
        }
      },
    );

    it('handles zero quantity holdings', () => {
      const holdings: Holding[] = [
        { ticker: 'GOOG', quantity: 0 },
        { ticker: 'MSFT', quantity: 5 },
      ];

      const dataMap = new Map<string, SecurityResponse>([
        ['GOOG', makeStock({
          ticker: 'GOOG',
          price: 10000,
        })],
        ['MSFT', makeStock({
          ticker: 'MSFT',
          price: 20000,
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);

      const goog = result.find((r) => r.ticker === 'GOOG')!;
      expect(goog.shareCount).toBe(0);
      expect(goog.totalValueCents).toBe(0);
      expect(goog.percentage).toBe(0);
      expect(Number.isFinite(goog.percentage)).toBe(true);
    });

    it(
      'handles all zero-price portfolio returning empty',
      () => {
        const holdings: Holding[] = [
          { ticker: 'A', quantity: 10 },
          { ticker: 'B', quantity: 5 },
        ];

        const dataMap = new Map<string, SecurityResponse>([
          ['A', makeStock({ ticker: 'A', price: 0 })],
          ['B', makeStock({ ticker: 'B', price: 0 })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);
        expect(result).toEqual([]);
      },
    );
  });
});
