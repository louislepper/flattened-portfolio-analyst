import { describe, it, expect } from 'vitest';
import { filterSmallAllocations } from './display-filter';
import type { FlattenedAllocation } from './types';

function makeAllocation(
  overrides: Partial<FlattenedAllocation> & { ticker: string },
): FlattenedAllocation {
  return {
    shareCount: 0,
    valueCentsFromComponents: 0,
    totalValueCents: 0,
    percentage: 0,
    price: null,
    tags: [],
    tagsLoaded: true,
    components: [],
    isUnknown: false,
    ...overrides,
  };
}

describe('filterSmallAllocations', () => {
  it('keeps allocations at or above 0.01% threshold', () => {
    const allocations = [
      makeAllocation({
        ticker: 'GOOG',
        percentage: 0.5,
        totalValueCents: 500000,
      }),
      makeAllocation({
        ticker: 'MSFT',
        percentage: 0.0001,
        totalValueCents: 100,
      }),
    ];

    const result = filterSmallAllocations(allocations);

    expect(result.visible).toHaveLength(2);
    expect(result.hiddenCount).toBe(0);
  });

  it('hides allocations below 0.01% threshold', () => {
    const allocations = [
      makeAllocation({
        ticker: 'GOOG',
        percentage: 0.5,
        totalValueCents: 500000,
      }),
      makeAllocation({
        ticker: 'TINY',
        percentage: 0.00009,
        totalValueCents: 90,
      }),
      makeAllocation({
        ticker: 'TINIER',
        percentage: 0.00001,
        totalValueCents: 10,
      }),
    ];

    const result = filterSmallAllocations(allocations);

    expect(result.visible).toHaveLength(1);
    expect(result.visible[0].ticker).toBe('GOOG');
    expect(result.hiddenCount).toBe(2);
    expect(result.hiddenPercentage).toBeCloseTo(0.0001);
    expect(result.hiddenValueCents).toBe(100);
  });

  it('returns zero hidden stats when nothing is filtered', () => {
    const allocations = [
      makeAllocation({
        ticker: 'GOOG',
        percentage: 0.6,
        totalValueCents: 600000,
      }),
      makeAllocation({
        ticker: 'MSFT',
        percentage: 0.4,
        totalValueCents: 400000,
      }),
    ];

    const result = filterSmallAllocations(allocations);

    expect(result.visible).toHaveLength(2);
    expect(result.hiddenCount).toBe(0);
    expect(result.hiddenPercentage).toBe(0);
    expect(result.hiddenValueCents).toBe(0);
  });

  it('handles empty allocations', () => {
    const result = filterSmallAllocations([]);

    expect(result.visible).toHaveLength(0);
    expect(result.hiddenCount).toBe(0);
  });

  it('handles all allocations being tiny', () => {
    const allocations = [
      makeAllocation({
        ticker: 'A',
        percentage: 0.00005,
        totalValueCents: 50,
      }),
      makeAllocation({
        ticker: 'B',
        percentage: 0.00003,
        totalValueCents: 30,
      }),
    ];

    const result = filterSmallAllocations(allocations);

    expect(result.visible).toHaveLength(0);
    expect(result.hiddenCount).toBe(2);
    expect(result.hiddenPercentage).toBeCloseTo(0.00008);
    expect(result.hiddenValueCents).toBe(80);
  });

  it('hides zero-percentage allocations', () => {
    const allocations = [
      makeAllocation({
        ticker: 'GOOG',
        percentage: 1.0,
        totalValueCents: 1000000,
      }),
      makeAllocation({
        ticker: 'FREE',
        percentage: 0,
        totalValueCents: 0,
      }),
    ];

    const result = filterSmallAllocations(allocations);

    expect(result.visible).toHaveLength(1);
    expect(result.hiddenCount).toBe(1);
  });
});
