import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllocationPieChart } from './AllocationPieChart';
import type { FlattenedAllocation } from '../../domain/types';

const ALLOCATIONS: FlattenedAllocation[] = [
  {
    ticker: 'GOOG',
    effectiveShares: 10,
    totalValueCents: 150000,
    percentage: 0.6,
    tags: [],
    components: [],
  },
  {
    ticker: 'MSFT',
    effectiveShares: 5,
    totalValueCents: 100000,
    percentage: 0.4,
    tags: [],
    components: [],
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
});
