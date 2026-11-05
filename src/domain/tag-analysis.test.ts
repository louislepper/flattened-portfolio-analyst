import { describe, it, expect } from 'vitest';
import {
  computeTagBreakdown,
  computeTagLoadedShare,
  NO_DATA,
  NON_EQUITY,
  UNCLASSIFIED,
  UNKNOWN_LOADING,
  UNTAGGED,
} from './tag-analysis';
import type { FlattenedAllocation } from './types';

function makeAllocation(
  overrides: Partial<FlattenedAllocation> & {
    ticker: string;
    totalValueCents: number;
  },
): FlattenedAllocation {
  return {
    shareCount: 0,
    valueCentsFromComponents: 0,
    percentage: 0,
    price: null,
    tags: [],
    tagStatus: 'loaded',
    components: [],
    kind: 'security',
    ...overrides,
  };
}

describe('computeTagBreakdown', () => {
  it('groups allocations by tag value', () => {
    const allocations: FlattenedAllocation[] = [
      makeAllocation({
        ticker: 'GOOG',
        totalValueCents: 60000,
        tags: [
          {
            key: 'market_cap',
            name: 'Market Capitalisation',
            value: 'Large Cap',
          },
        ],
      }),
      makeAllocation({
        ticker: 'MSFT',
        totalValueCents: 40000,
        tags: [
          {
            key: 'market_cap',
            name: 'Market Capitalisation',
            value: 'Large Cap',
          },
        ],
      }),
      makeAllocation({
        ticker: 'SMALL',
        totalValueCents: 20000,
        tags: [
          {
            key: 'market_cap',
            name: 'Market Capitalisation',
            value: 'Small Cap',
          },
        ],
      }),
    ];

    const result = computeTagBreakdown(allocations, 'market_cap');

    expect(result).toHaveLength(2);
    expect(result[0].tagValue).toBe('Large Cap');
    expect(result[0].totalValueCents).toBe(100000);
    expect(result[0].percentage).toBeCloseTo(100000 / 120000);
    expect(result[1].tagValue).toBe('Small Cap');
    expect(result[1].totalValueCents).toBe(20000);
    expect(result[1].percentage).toBeCloseTo(20000 / 120000);
  });

  it('puts untagged securities in "Untagged" bucket', () => {
    const allocations: FlattenedAllocation[] = [
      makeAllocation({
        ticker: 'GOOG',
        totalValueCents: 50000,
        tags: [
          {
            key: 'market_cap',
            name: 'Market Capitalisation',
            value: 'Large Cap',
          },
        ],
      }),
      makeAllocation({
        ticker: 'UNKNOWN',
        totalValueCents: 30000,
        tags: [],
      }),
    ];

    const result = computeTagBreakdown(allocations, 'market_cap');

    expect(result).toHaveLength(2);
    const untagged = result.find(
      (r) => r.tagValue === 'Untagged',
    )!;
    expect(untagged.totalValueCents).toBe(30000);
    expect(untagged.percentage).toBeCloseTo(30000 / 80000);
  });

  it('sorts descending by percentage', () => {
    const allocations: FlattenedAllocation[] = [
      makeAllocation({
        ticker: 'A',
        totalValueCents: 10000,
        tags: [
          { key: 'sector', name: 'Sector', value: 'Tech' },
        ],
      }),
      makeAllocation({
        ticker: 'B',
        totalValueCents: 50000,
        tags: [
          { key: 'sector', name: 'Sector', value: 'Finance' },
        ],
      }),
      makeAllocation({
        ticker: 'C',
        totalValueCents: 30000,
        tags: [
          { key: 'sector', name: 'Sector', value: 'Health' },
        ],
      }),
    ];

    const result = computeTagBreakdown(allocations, 'sector');

    expect(result[0].tagValue).toBe('Finance');
    expect(result[1].tagValue).toBe('Health');
    expect(result[2].tagValue).toBe('Tech');
  });

  it('returns empty array for empty allocations', () => {
    expect(computeTagBreakdown([], 'market_cap')).toEqual([]);
  });

  it('handles tag key with no matches', () => {
    const allocations: FlattenedAllocation[] = [
      makeAllocation({
        ticker: 'GOOG',
        totalValueCents: 50000,
        tags: [
          { key: 'sector', name: 'Sector', value: 'Tech' },
        ],
      }),
    ];

    const result = computeTagBreakdown(
      allocations,
      'nonexistent_key',
    );

    expect(result).toHaveLength(1);
    expect(result[0].tagValue).toBe('Untagged');
    expect(result[0].percentage).toBeCloseTo(1.0);
  });

  it(
    'puts loading allocations in "Unknown - loading" bucket',
    () => {
      const allocations: FlattenedAllocation[] = [
        makeAllocation({
          ticker: 'GOOG',
          totalValueCents: 50000,
          tags: [
            {
              key: 'market_cap',
              name: 'Market Capitalisation',
              value: 'Large Cap',
            },
          ],
          tagStatus: 'loaded',
        }),
        makeAllocation({
          ticker: 'MSFT',
          totalValueCents: 30000,
          tags: [],
          tagStatus: 'pending',
        }),
      ];

      const result = computeTagBreakdown(
        allocations,
        'market_cap',
      );

      expect(result).toHaveLength(2);
      const loading = result.find(
        (r) => r.tagValue === 'Unknown - loading',
      )!;
      expect(loading.totalValueCents).toBe(30000);
      expect(loading.percentage)
        .toBeCloseTo(30000 / 80000);
    },
  );

  it(
    'distinguishes loading from genuinely untagged',
    () => {
      const allocations: FlattenedAllocation[] = [
        makeAllocation({
          ticker: 'LOADING',
          totalValueCents: 20000,
          tags: [],
          tagStatus: 'pending',
        }),
        makeAllocation({
          ticker: 'UNTAGGED',
          totalValueCents: 30000,
          tags: [],
          tagStatus: 'loaded',
        }),
      ];

      const result = computeTagBreakdown(
        allocations,
        'market_cap',
      );

      expect(result).toHaveLength(2);
      const loading = result.find(
        (r) => r.tagValue === 'Unknown - loading',
      )!;
      expect(loading.totalValueCents).toBe(20000);
      const untagged = result.find(
        (r) => r.tagValue === 'Untagged',
      )!;
      expect(untagged.totalValueCents).toBe(30000);
    },
  );
});

describe('computeTagBreakdown buckets', () => {
  const sector = (value: string) => [
    { key: 'sector', name: 'Sector', value },
  ];

  const mixed: FlattenedAllocation[] = [
    makeAllocation({ ticker: 'AAPL', totalValueCents: 30000, tags: sector('Tech') }),
    makeAllocation({ ticker: 'MSFT', totalValueCents: 10000, tags: sector('Tech') }),
    makeAllocation({ ticker: 'JPM', totalValueCents: 5000, tags: sector('Finance') }),
    makeAllocation({ ticker: 'PEND', totalValueCents: 8000, tagStatus: 'pending' }),
    makeAllocation({ ticker: 'GONE', totalValueCents: 7000, tagStatus: 'failed' }),
    makeAllocation({ ticker: 'BARE', totalValueCents: 6000 }),
    makeAllocation({
      ticker: 'Non-equity holdings (from GOVI)',
      kind: 'non-equity',
      totalValueCents: 20000,
    }),
    makeAllocation({
      ticker: 'Unclassified holdings (from IEFA)',
      kind: 'unresolved',
      totalValueCents: 9000,
    }),
    makeAllocation({
      ticker: 'Unknown (From IEFA)',
      kind: 'unknown',
      totalValueCents: 5000,
    }),
  ];

  it('puts every kind of row in its own bucket', () => {
    const result = computeTagBreakdown(mixed, 'sector');
    const byValue = Object.fromEntries(
      result.map((r) => [r.tagValue, r.totalValueCents]),
    );

    expect(byValue).toEqual({
      Tech: 40000,
      Finance: 5000,
      [UNKNOWN_LOADING]: 8000,
      [NO_DATA]: 7000,
      [NON_EQUITY]: 20000,
      [UNCLASSIFIED]: 9000,
      [UNTAGGED]: 11000,
    });
  });

  it('has percentages summing to 1, sorted descending', () => {
    const result = computeTagBreakdown(mixed, 'sector');

    expect(result.reduce((s, r) => s + r.percentage, 0)).toBeCloseTo(1);
    const pcts = result.map((r) => r.percentage);
    expect(pcts).toEqual([...pcts].sort((a, b) => b - a));
    expect(result[0]).toMatchObject({ tagValue: 'Tech', percentage: 0.4 });
  });

  it('never uses a tag on a non-equity or unresolved row', () => {
    const result = computeTagBreakdown([
      makeAllocation({
        ticker: 'Non-equity holdings (from GOVI)',
        kind: 'non-equity',
        totalValueCents: 100,
        tags: sector('Telecom'),
      }),
      makeAllocation({
        ticker: 'Unclassified holdings (from GOVI)',
        kind: 'unresolved',
        totalValueCents: 100,
        tags: sector('Telecom'),
      }),
    ], 'sector');

    expect(result.map((r) => r.tagValue).sort()).toEqual(
      [NON_EQUITY, UNCLASSIFIED].sort(),
    );
  });

  it('uses a tag a failed row somehow has rather than "No data"', () => {
    const result = computeTagBreakdown([
      makeAllocation({
        ticker: 'X',
        totalValueCents: 100,
        tagStatus: 'failed',
        tags: sector('Tech'),
      }),
    ], 'sector');

    expect(result[0].tagValue).toBe('Tech');
  });

  it('has no loading bucket once nothing is pending', () => {
    const settled = mixed.filter((a) => a.tagStatus !== 'pending');
    const result = computeTagBreakdown(settled, 'sector');

    expect(result.map((r) => r.tagValue)).not.toContain(UNKNOWN_LOADING);
  });
});

describe('computeTagLoadedShare', () => {
  it('is 0 when every row is pending', () => {
    expect(computeTagLoadedShare([
      makeAllocation({ ticker: 'A', totalValueCents: 100, tagStatus: 'pending' }),
      makeAllocation({ ticker: 'B', totalValueCents: 300, tagStatus: 'pending' }),
    ])).toBe(0);
  });

  it('weights by value, not by count', () => {
    expect(computeTagLoadedShare([
      makeAllocation({ ticker: 'A', totalValueCents: 900 }),
      makeAllocation({ ticker: 'B', totalValueCents: 50, tagStatus: 'pending' }),
      makeAllocation({ ticker: 'C', totalValueCents: 50, tagStatus: 'pending' }),
    ])).toBeCloseTo(0.9);
  });

  it('counts aggregate rows as loaded', () => {
    expect(computeTagLoadedShare([
      makeAllocation({ ticker: 'A', totalValueCents: 100, tagStatus: 'pending' }),
      makeAllocation({ ticker: 'N', kind: 'non-equity', totalValueCents: 100 }),
      makeAllocation({ ticker: 'U', kind: 'unresolved', totalValueCents: 100 }),
      makeAllocation({ ticker: 'R', kind: 'unknown', totalValueCents: 100 }),
    ])).toBeCloseTo(0.75);
  });

  it('reaches 1 when the only unloaded rows failed', () => {
    expect(computeTagLoadedShare([
      makeAllocation({ ticker: 'A', totalValueCents: 100 }),
      makeAllocation({ ticker: 'B', totalValueCents: 900, tagStatus: 'failed' }),
    ])).toBe(1);
  });

  it('is 1 for an empty portfolio', () => {
    expect(computeTagLoadedShare([])).toBe(1);
  });
});
