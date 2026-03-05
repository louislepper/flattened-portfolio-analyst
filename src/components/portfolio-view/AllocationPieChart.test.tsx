import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllocationPieChart } from './AllocationPieChart';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';

const ALLOCATIONS: FlattenedAllocation[] = [
  {
    ticker: 'GOOG',
    shareCount: 10,
    valueCentsFromComponents: 0,
    totalValueCents: 150000,
    percentage: 0.6,
    price: 15000,
    tags: [],
    tagsLoaded: true,
    components: [],
    isUnknown: false,
  },
  {
    ticker: 'MSFT',
    shareCount: 5,
    valueCentsFromComponents: 0,
    totalValueCents: 100000,
    percentage: 0.4,
    price: 20000,
    tags: [],
    tagsLoaded: true,
    components: [],
    isUnknown: false,
  },
];

describe('AllocationPieChart', () => {
  it('renders nothing when data is empty', () => {
    const { container } = render(
      <AllocationPieChart
        viewMode={{ kind: 'securities' }}
        allocations={[]}
        tagBreakdown={[]}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders chart with allocation data', () => {
    render(
      <AllocationPieChart
        viewMode={{ kind: 'securities' }}
        allocations={ALLOCATIONS}
        tagBreakdown={[]}
      />,
    );

    expect(
      screen.getByText('GOOG'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('MSFT'),
    ).toBeInTheDocument();
  });

  it(
    'limits to 19 slices plus everything else',
    () => {
      const manyAllocations: FlattenedAllocation[] =
        Array.from({ length: 25 }, (_, i) => ({
          ticker: `STOCK_${i}`,
          shareCount: 100 - i,
          valueCentsFromComponents: 0,
          totalValueCents: (100 - i) * 1000,
          percentage: (100 - i) / 2150,
          price: 1000,
          tags: [],
          tagsLoaded: true,
          components: [],
          isUnknown: false,
        }));

      render(
        <AllocationPieChart
          viewMode={{ kind: 'securities' }}
          allocations={manyAllocations}
          tagBreakdown={[]}
        />,
      );

      // First 19 should be visible
      for (let i = 0; i < 19; i++) {
        expect(
          screen.getByText(`STOCK_${i}`),
        ).toBeInTheDocument();
      }

      // 20th and beyond should not be individual slices
      expect(
        screen.queryByText('STOCK_19'),
      ).not.toBeInTheDocument();

      // Should have an "Everything else" entry
      expect(
        screen.getByText('Everything else'),
      ).toBeInTheDocument();
    },
  );

  it(
    'limits tag view to 19 slices plus everything else',
    () => {
      const manyTags: TagBreakdownEntry[] =
        Array.from({ length: 25 }, (_, i) => ({
          tagValue: `Tag_${i}`,
          totalValueCents: (25 - i) * 1000,
          percentage: (25 - i) / 325,
        }));

      render(
        <AllocationPieChart
          viewMode={{
            kind: 'tag',
            tagKey: 'sector',
            tagName: 'Sector',
          }}
          allocations={[]}
          tagBreakdown={manyTags}
        />,
      );

      for (let i = 0; i < 19; i++) {
        expect(
          screen.getByText(`Tag_${i}`),
        ).toBeInTheDocument();
      }

      expect(
        screen.queryByText('Tag_19'),
      ).not.toBeInTheDocument();

      expect(
        screen.getByText('Everything else'),
      ).toBeInTheDocument();
    },
  );
});
