import { describe, it, expect } from 'vitest';
import { computeTagBreakdown } from './tag-analysis';
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
    tagsLoaded: true,
    components: [],
    isUnknown: false,
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
          tagsLoaded: true,
        }),
        makeAllocation({
          ticker: 'MSFT',
          totalValueCents: 30000,
          tags: [],
          tagsLoaded: false,
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
          tagsLoaded: false,
        }),
        makeAllocation({
          ticker: 'UNTAGGED',
          totalValueCents: 30000,
          tags: [],
          tagsLoaded: true,
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
