import { describe, it, expect } from 'vitest';
import { countCompanies, flattenPortfolio } from './aggregation';
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
    isin: null,
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
    isin: null,
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
            isin: null,
            percentage: 0.2, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            isin: null,
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
    expect(goog.tagStatus).toBe('loaded');
    expect(goog.kind).toBe('security');

    const msft = result.find((r) => r.ticker === 'MSFT')!;
    expect(msft.shareCount).toBe(0);
    expect(msft.valueCentsFromComponents).toBeCloseTo(40000);
    expect(msft.totalValueCents).toBeCloseTo(40000);
    expect(msft.percentage).toBeCloseTo(0.267, 2);
    expect(msft.price).toBe(null);
    expect(msft.tagStatus).toBe('pending');
    expect(msft.kind).toBe('security');

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
            isin: null,
            percentage: 0.2, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            isin: null,
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
            isin: null,
            percentage: 0.5, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            isin: null,
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
            isin: null,
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
            isin: null,
            percentage: 0.4, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'GOOG',
            isin: null,
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
    expect(goog.tagStatus).toBe('loaded');
    expect(goog.kind).toBe('security');

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
            isin: null,
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
            isin: null,
            percentage: 0.2, refreshedAt: REFRESHED_AT,
          },
          {
            ticker: 'MSFT',
            isin: null,
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
                isin: null,
                percentage: 0.4, refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'AAPL',
                isin: null,
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
        expect(goog.kind).toBe('security');

        const aapl = result.find(
          (r) => r.ticker === 'AAPL',
        )!;
        expect(aapl.valueCentsFromComponents)
          .toBeCloseTo(40000);
        expect(aapl.totalValueCents).toBeCloseTo(40000);
        expect(aapl.kind).toBe('security');

        const unknown = result.find((r) => r.kind === 'unknown')!;
        expect(unknown.ticker).toBe(
          'Unknown (From PARTIAL)',
        );
        expect(unknown.totalValueCents).toBeCloseTo(80000);
        expect(unknown.shareCount).toBe(0);
        expect(unknown.tags).toEqual([]);
        expect(unknown.tagStatus).toBe('loaded');
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
        expect(result[0].kind).toBe('unknown');
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
                isin: null,
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
                isin: null,
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
        expect(unknownA.kind).toBe('unknown');

        const unknownB = result.find(
          (r) => r.ticker === 'Unknown (From ETF_B)',
        )!;
        expect(unknownB.totalValueCents).toBeCloseTo(14000);
        expect(unknownB.kind).toBe('unknown');

        const goog = result.find(
          (r) => r.ticker === 'GOOG',
        )!;
        expect(goog.totalValueCents).toBeCloseTo(16000);
        expect(goog.kind).toBe('security');
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
                isin: null,
                percentage: 0.7, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        // 10 * 10000 = 100000 total
        // GOOG: 70000, unknown: 30000
        expect(result).toHaveLength(2);

        const unknown = result.find((r) => r.kind === 'unknown')!;
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
                isin: null,
                percentage: 0.6, refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'MSFT',
                isin: null,
                percentage: 0.4, refreshedAt: REFRESHED_AT,
              },
            ],
          })],
        ]);

        const result = flattenPortfolio(holdings, dataMap);

        expect(result).toHaveLength(2);
        expect(
          result.every((r) => r.kind !== 'unknown'),
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
                isin: null,
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

        const unknown = result.find((r) => r.kind === 'unknown')!;
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
                isin: null,
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
        expect(goog.tagStatus).toBe('loaded');
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
                isin: null,
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
        expect(goog.tagStatus).toBe('loaded');
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
                isin: null,
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
        expect(goog.tagStatus).toBe('loaded');
      },
    );

    it(
      'shows null price and tagStatus=pending when no data',
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
                isin: null,
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
        expect(goog.tagStatus).toBe('pending');
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
                isin: null,
                percentage: 0.5,
                refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'MSFT',
                isin: null,
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
              isin: null,
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
                isin: null,
                percentage: 0.3, refreshedAt: REFRESHED_AT,
              },
              {
                ticker: 'B',
                isin: null,
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

  it('treats a zero constituent price as unknown', () => {
    const holdings: Holding[] = [{ ticker: 'ETF', quantity: 1 }];
    const securityData = new Map<string, SecurityResponse>([
      ['ETF', makeEtf({
        ticker: 'ETF',
        price: 10000,
        compositeSecurities: [
          { ticker: 'A', isin: null, percentage: 1, refreshedAt: REFRESHED_AT },
        ],
      })],
    ]);
    const compositeData = new Map<string, SecurityResponse>([
      ['A', makeStock({ ticker: 'A', price: 0 })],
    ]);

    const result = flattenPortfolio(holdings, securityData, compositeData);
    const a = result.find((r) => r.ticker === 'A');
    expect(a?.price).toBeNull();
    expect(a?.totalValueCents).toBe(10000);
  });
});

describe('flattenPortfolio constituent kinds', () => {
  const constituent = (
    ticker: string,
    percentage: number,
    kind?: 'equity' | 'non-equity' | 'unresolved',
  ) => ({
    ticker,
    isin: null,
    percentage,
    refreshedAt: REFRESHED_AT,
    ...(kind ? { kind } : {}),
  });

  const att = makeStock({
    ticker: 'T',
    price: 2000,
    tags: [{ key: 'sector', name: 'Sector', value: 'Telecom' }],
  });

  const byTicker = (result: ReturnType<typeof flattenPortfolio>) =>
    new Map(result.map((r) => [r.ticker, r]));

  it(
    'keeps a bond fund\'s Treasuries ("T") apart from a direct AT&T holding',
    () => {
      const holdings: Holding[] = [
        { ticker: 'T', quantity: 10 },
        { ticker: 'GOVI', quantity: 1 },
      ];
      const dataMap = new Map([
        ['T', att],
        ['GOVI', makeEtf({
          ticker: 'GOVI',
          price: 100000,
          compositeSecurities: [
            constituent('T', 0.9, 'non-equity'),
            constituent('B', 0.1, 'non-equity'),
          ],
        })],
      ]);

      const rows = byTicker(flattenPortfolio(holdings, dataMap));

      const attRow = rows.get('T')!;
      expect(attRow.kind).toBe('security');
      expect(attRow.totalValueCents).toBe(20000);
      expect(attRow.components).toEqual([
        { fromTicker: 'T', valueCents: 20000 },
      ]);
      const bonds = rows.get('Non-equity holdings (from GOVI)')!;
      expect(bonds.kind).toBe('non-equity');
      expect(bonds.totalValueCents).toBeCloseTo(100000);
      expect(bonds.tagStatus).toBe('loaded');
      expect(bonds.tags).toEqual([]);
      expect(bonds.price).toBeNull();
      expect(rows.has('B')).toBe(false);
      expect(rows.size).toBe(2);
    },
  );

  it('does not borrow a colliding doc\'s tags for non-equity constituents', () => {
    const holdings: Holding[] = [{ ticker: 'GOVI', quantity: 1 }];
    const dataMap = new Map([
      ['GOVI', makeEtf({
        ticker: 'GOVI',
        price: 1000,
        compositeSecurities: [constituent('T', 1, 'non-equity')],
      })],
    ]);
    // AT&T's doc is in the composite map (e.g. from another fund).
    const compositeMap = new Map([['T', att]]);

    const result = flattenPortfolio(holdings, dataMap, compositeMap);

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('non-equity');
    expect(result[0].tags).toEqual([]);
  });

  it('aggregates unresolved constituents into one row per fund', () => {
    const holdings: Holding[] = [
      { ticker: 'IEFA', quantity: 1 },
      { ticker: 'VXUS', quantity: 1 },
    ];
    const dataMap = new Map([
      ['IEFA', makeEtf({
        ticker: 'IEFA',
        price: 10000,
        compositeSecurities: [
          constituent('XS1', 0.3, 'unresolved'),
          constituent('XS2', 0.2, 'unresolved'),
          constituent('AAPL', 0.5, 'equity'),
        ],
      })],
      ['VXUS', makeEtf({
        ticker: 'VXUS',
        price: 20000,
        compositeSecurities: [
          constituent('XS1', 0.5, 'unresolved'),
          constituent('AAPL', 0.5, 'equity'),
        ],
      })],
    ]);

    const rows = byTicker(flattenPortfolio(holdings, dataMap));

    expect(rows.get('Unclassified holdings (from IEFA)')).toMatchObject({
      kind: 'unresolved',
      totalValueCents: 5000,
      components: [{ fromTicker: 'IEFA', valueCents: 5000 }],
    });
    expect(rows.get('Unclassified holdings (from VXUS)')).toMatchObject({
      kind: 'unresolved',
      totalValueCents: 10000,
    });
    expect(rows.has('XS1')).toBe(false);
    expect(rows.get('AAPL')!.totalValueCents).toBe(15000);
  });

  it(
    'shows non-equity, unclassified and unknown remainder rows side by side',
    () => {
      const holdings: Holding[] = [{ ticker: 'MIX', quantity: 1 }];
      const dataMap = new Map([
        ['MIX', makeEtf({
          ticker: 'MIX',
          price: 100000,
          compositeSecurities: [
            constituent('AAPL', 0.4, 'equity'),
            constituent('T', 0.2, 'non-equity'),
            constituent('ESZ6', 0.1, 'non-equity'),
            constituent('XS1', 0.1, 'unresolved'),
          ],
        })],
      ]);

      const result = flattenPortfolio(holdings, dataMap);
      const rows = byTicker(result);

      expect(rows.get('AAPL')!.totalValueCents).toBeCloseTo(40000);
      expect(rows.get('Non-equity holdings (from MIX)')!.totalValueCents)
        .toBeCloseTo(30000);
      expect(rows.get('Unclassified holdings (from MIX)')!.totalValueCents)
        .toBeCloseTo(10000);
      const unknown = rows.get('Unknown (From MIX)')!;
      expect(unknown.kind).toBe('unknown');
      expect(unknown.totalValueCents).toBeCloseTo(20000);
      const totalPct = result.reduce((s, r) => s + r.percentage, 0);
      expect(totalPct).toBeCloseTo(1);
      const totalValue = result.reduce((s, r) => s + r.totalValueCents, 0);
      expect(totalValue).toBeCloseTo(100000);
    },
  );

  it('splits a ticker that is equity in one fund and non-equity in another', () => {
    const holdings: Holding[] = [
      { ticker: 'SPY', quantity: 1 },
      { ticker: 'GOVI', quantity: 1 },
    ];
    const dataMap = new Map([
      ['SPY', makeEtf({
        ticker: 'SPY',
        price: 10000,
        compositeSecurities: [constituent('T', 1, 'equity')],
      })],
      ['GOVI', makeEtf({
        ticker: 'GOVI',
        price: 30000,
        compositeSecurities: [constituent('T', 1, 'non-equity')],
      })],
    ]);
    const compositeMap = new Map([['T', att]]);

    const rows = byTicker(flattenPortfolio(holdings, dataMap, compositeMap));

    expect(rows.get('T')).toMatchObject({
      kind: 'security',
      totalValueCents: 10000,
      components: [{ fromTicker: 'SPY', valueCents: 10000 }],
      tagStatus: 'loaded',
    });
    expect(rows.get('Non-equity holdings (from GOVI)')).toMatchObject({
      kind: 'non-equity',
      totalValueCents: 30000,
    });
  });

  it('accumulates the same fund held twice into its aggregate rows', () => {
    const holdings: Holding[] = [
      { ticker: 'GOVI', quantity: 1 },
      { ticker: 'GOVI', quantity: 2 },
    ];
    const dataMap = new Map([
      ['GOVI', makeEtf({
        ticker: 'GOVI',
        price: 1000,
        compositeSecurities: [
          constituent('T', 0.5, 'non-equity'),
          constituent('XS1', 0.25, 'unresolved'),
          constituent('AAPL', 0.25, 'equity'),
        ],
      })],
    ]);

    const result = flattenPortfolio(holdings, dataMap);
    const rows = byTicker(result);

    expect(result).toHaveLength(3);
    expect(rows.get('Non-equity holdings (from GOVI)')!.totalValueCents)
      .toBe(1500);
    expect(rows.get('Non-equity holdings (from GOVI)')!.components)
      .toHaveLength(2);
    expect(rows.get('Unclassified holdings (from GOVI)')!.totalValueCents)
      .toBe(750);
    expect(rows.get('AAPL')!.totalValueCents).toBe(750);
  });

  it('treats legacy constituents without kind as equity unless not a ticker', () => {
    const holdings: Holding[] = [{ ticker: 'OLD', quantity: 1 }];
    const dataMap = new Map([
      ['OLD', makeEtf({
        ticker: 'OLD',
        price: 10000,
        compositeSecurities: [
          constituent('AAPL', 0.5),
          constituent('UNKNOWN', 0.2),
          constituent('CASH USD', 0.3),
        ],
      })],
    ]);

    const rows = byTicker(flattenPortfolio(holdings, dataMap));

    expect(rows.get('AAPL')).toMatchObject({
      kind: 'security',
      tagStatus: 'pending',
      totalValueCents: 5000,
    });
    expect(rows.get('Unclassified holdings (from OLD)')).toMatchObject({
      kind: 'unresolved',
      totalValueCents: 5000,
    });
    expect(rows.has('UNKNOWN')).toBe(false);
    expect(rows.has('CASH USD')).toBe(false);
  });

  it('gives an all-equity portfolio the same rows with or without kind', () => {
    const holdings: Holding[] = [
      { ticker: 'GOOG', quantity: 3 },
      { ticker: 'ETF', quantity: 2 },
    ];
    const legacyEtf = makeEtf({
      ticker: 'ETF',
      price: 10000,
      compositeSecurities: [
        constituent('GOOG', 0.5),
        constituent('MSFT', 0.3),
      ],
    });
    const kindEtf = makeEtf({
      ...legacyEtf,
      compositeSecurities: legacyEtf.compositeSecurities.map((c) => ({
        ...c,
        kind: 'equity' as const,
      })),
    });
    const goog = makeStock({ ticker: 'GOOG', price: 5000 });

    const legacy = flattenPortfolio(
      holdings,
      new Map([['GOOG', goog], ['ETF', legacyEtf]]),
    );
    const withKind = flattenPortfolio(
      holdings,
      new Map([['GOOG', goog], ['ETF', kindEtf]]),
    );

    expect(withKind).toEqual(legacy);
    // GOOG: 3 * 5000 + 20000 * 0.5; MSFT: 20000 * 0.3; unknown 20000 * 0.2
    expect(legacy.map((r) => r.ticker)).toEqual([
      'GOOG',
      'MSFT',
      'Unknown (From ETF)',
    ]);
    expect(legacy[0].totalValueCents).toBeCloseTo(25000);
    expect(legacy[1].totalValueCents).toBeCloseTo(6000);
    expect(legacy[2].totalValueCents).toBeCloseTo(4000);
    expect(legacy.reduce((s, r) => s + r.totalValueCents, 0))
      .toBeCloseTo(35000);
  });
});

describe('flattenPortfolio tag status', () => {
  const etf = makeEtf({
    ticker: 'ETF',
    price: 10000,
    compositeSecurities: [
      { ticker: 'AAPL', isin: null, percentage: 0.5, refreshedAt: REFRESHED_AT },
      { ticker: 'MSFT', isin: null, percentage: 0.5, refreshedAt: REFRESHED_AT },
    ],
  });
  const holdings: Holding[] = [{ ticker: 'ETF', quantity: 1 }];

  it('marks constituents pending, failed or loaded', () => {
    const result = flattenPortfolio(
      holdings,
      new Map([['ETF', etf]]),
      new Map([['AAPL', makeStock({ ticker: 'AAPL', price: 100 })]]),
      new Set(['MSFT']),
    );
    const status = Object.fromEntries(
      result.map((r) => [r.ticker, r.tagStatus]),
    );

    expect(status).toEqual({ AAPL: 'loaded', MSFT: 'failed' });
  });

  it('keeps the failed constituent in the total', () => {
    const result = flattenPortfolio(
      holdings,
      new Map([['ETF', etf]]),
      new Map(),
      new Set(['AAPL', 'MSFT']),
    );

    expect(result.reduce((s, r) => s + r.totalValueCents, 0)).toBe(10000);
    expect(result.every((r) => r.tagStatus === 'failed')).toBe(true);
  });

  it('marks a direct holding with an override price but failed lookup as failed', () => {
    const result = flattenPortfolio(
      [{ ticker: 'ZZZZ', quantity: 2 }],
      new Map([['ZZZZ', makeStock({ ticker: 'ZZZZ', price: 500 })]]),
      new Map(),
      new Set(['ZZZZ']),
    );

    expect(result[0]).toMatchObject({
      ticker: 'ZZZZ',
      kind: 'security',
      tagStatus: 'failed',
      totalValueCents: 1000,
    });
  });

  it('prefers loaded data when a ticker is both a direct holding and a constituent', () => {
    const msft = makeStock({
      ticker: 'MSFT',
      price: 100,
      tags: [{ key: 'sector', name: 'Sector', value: 'Tech' }],
    });
    const result = flattenPortfolio(
      [...holdings, { ticker: 'MSFT', quantity: 1 }],
      new Map([['ETF', etf], ['MSFT', msft]]),
      new Map(),
      new Set(['AAPL']),
    );
    const msftRow = result.find((r) => r.ticker === 'MSFT')!;

    expect(msftRow.tagStatus).toBe('loaded');
    expect(msftRow.tags).toEqual(msft.tags);
  });

  it('leaves a holding with no security data out of the total', () => {
    const result = flattenPortfolio(
      [{ ticker: 'GOOG', quantity: 1 }, { ticker: 'GONE', quantity: 100 }],
      new Map([['GOOG', makeStock({ ticker: 'GOOG', price: 1000 })]]),
      new Map(),
      new Set(['GONE']),
    );

    expect(result).toHaveLength(1);
    expect(result[0].percentage).toBe(1);
  });
});

describe('countCompanies', () => {
  it('counts only security rows whose lookup did not fail', () => {
    const result = flattenPortfolio(
      [{ ticker: 'MIX', quantity: 1 }],
      new Map([['MIX', makeEtf({
        ticker: 'MIX',
        price: 10000,
        compositeSecurities: [
          { ticker: 'AAPL', isin: null, percentage: 0.2, refreshedAt: REFRESHED_AT, kind: 'equity' },
          { ticker: 'MSFT', isin: null, percentage: 0.2, refreshedAt: REFRESHED_AT, kind: 'equity' },
          { ticker: 'GONE', isin: null, percentage: 0.2, refreshedAt: REFRESHED_AT, kind: 'equity' },
          { ticker: 'ESZ6', isin: null, percentage: 0.2, refreshedAt: REFRESHED_AT, kind: 'non-equity' },
          { ticker: 'XS1', isin: null, percentage: 0.1, refreshedAt: REFRESHED_AT, kind: 'unresolved' },
        ],
      })]]),
      new Map([['AAPL', makeStock({ ticker: 'AAPL', price: 1 })]]),
      new Set(['GONE']),
    );

    // AAPL (loaded) + MSFT (pending); not GONE, non-equity, unclassified, unknown
    expect(result).toHaveLength(6);
    expect(countCompanies(result)).toBe(2);
  });
});
