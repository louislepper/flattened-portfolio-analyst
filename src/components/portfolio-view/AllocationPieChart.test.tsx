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

  it('aggregates multiple unknown allocations into a single Unknown slice', () => {
    const allocations: FlattenedAllocation[] = [
      ...ALLOCATIONS,
      {
        ticker: 'Unknown (From ETF1)',
        shareCount: 0,
        valueCentsFromComponents: 10000,
        totalValueCents: 10000,
        percentage: 0.05,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: true,
      },
      {
        ticker: 'Unknown (From ETF2)',
        shareCount: 0,
        valueCentsFromComponents: 5000,
        totalValueCents: 5000,
        percentage: 0.03,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: true,
      },
    ];

    render(
      <AllocationPieChart
        viewMode={{ kind: 'securities' }}
        allocations={allocations}
        tagBreakdown={[]}
      />,
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.queryByText('Unknown (From ETF1)')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown (From ETF2)')).not.toBeInTheDocument();
  });

  it('always shows Unknown even when tiny', () => {
    const allocations: FlattenedAllocation[] = [
      {
        ticker: 'GOOG',
        shareCount: 100,
        valueCentsFromComponents: 0,
        totalValueCents: 1000000,
        percentage: 0.9999,
        price: 10000,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: false,
      },
      {
        ticker: 'Unknown (From ETF1)',
        shareCount: 0,
        valueCentsFromComponents: 1,
        totalValueCents: 1,
        percentage: 0.000001,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: true,
      },
    ];

    render(
      <AllocationPieChart
        viewMode={{ kind: 'securities' }}
        allocations={allocations}
        tagBreakdown={[]}
      />,
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('always shows Unknown even when MAX_PIE_SLICES is exceeded', () => {
    const manyAllocations: FlattenedAllocation[] = [
      ...Array.from({ length: 25 }, (_, i) => ({
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
      })),
      {
        ticker: 'Unknown (From ETF1)',
        shareCount: 0,
        valueCentsFromComponents: 500,
        totalValueCents: 500,
        percentage: 0.001,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: true,
      },
    ];

    render(
      <AllocationPieChart
        viewMode={{ kind: 'securities' }}
        allocations={manyAllocations}
        tagBreakdown={[]}
      />,
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Everything else')).toBeInTheDocument();
  });

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
