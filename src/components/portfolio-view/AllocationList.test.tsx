import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllocationList } from './AllocationList';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';

const ALLOCATIONS: FlattenedAllocation[] = [
  {
    ticker: 'GOOG',
    effectiveShares: 13.333,
    totalValueCents: 200000,
    percentage: 0.5,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
    ],
    components: [],
  },
  {
    ticker: 'MSFT',
    effectiveShares: 5,
    totalValueCents: 200000,
    percentage: 0.5,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
    ],
    components: [],
  },
];

const TAG_BREAKDOWN: TagBreakdownEntry[] = [
  {
    tagValue: 'Large Cap',
    totalValueCents: 400000,
    percentage: 1.0,
  },
];

describe('AllocationList', () => {
  it('renders securities table in securities mode', () => {
    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={ALLOCATIONS}
        tagBreakdown={[]}
      />,
    );

    expect(screen.getByText('Ticker')).toBeInTheDocument();
    expect(screen.getByText('Shares')).toBeInTheDocument();
    expect(screen.getByText('GOOG')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getAllByText('50.0%')).toHaveLength(2);
  });

  it('renders tag breakdown table in tag mode', () => {
    render(
      <AllocationList
        viewMode={{
          kind: 'tag',
          tagKey: 'market_cap',
          tagName: 'Market Capitalisation',
        }}
        allocations={ALLOCATIONS}
        tagBreakdown={TAG_BREAKDOWN}
      />,
    );

    expect(
      screen.getByText('Market Capitalisation'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Large Cap'),
    ).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('formats dollar values correctly', () => {
    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={ALLOCATIONS}
        tagBreakdown={[]}
      />,
    );

    expect(
      screen.getAllByText('$2000.00'),
    ).toHaveLength(2);
  });
});
