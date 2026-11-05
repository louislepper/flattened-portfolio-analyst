import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConcentrationBar } from './ConcentrationBar';
import type { FlattenedAllocation } from '../../domain/types';

function row(
  ticker: string,
  kind: FlattenedAllocation['kind'],
  percentage: number,
): FlattenedAllocation {
  return {
    ticker,
    kind,
    shareCount: 0,
    valueCentsFromComponents: percentage * 1000,
    totalValueCents: percentage * 1000,
    percentage,
    price: null,
    tags: [],
    tagStatus: 'loaded',
    components: [],
  };
}

describe('ConcentrationBar', () => {
  it('never shows a per-fund aggregate as a company segment', () => {
    render(
      <ConcentrationBar
        allocations={[
          row('Non-equity holdings (from GOVI)', 'non-equity', 0.4),
          row('AAPL', 'security', 0.3),
          row('Unclassified holdings (from GOVI)', 'unresolved', 0.2),
          row('Unknown (From GOVI)', 'unknown', 0.1),
        ]}
      />,
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(
      screen.queryByText('Non-equity holdings (from GOVI)'),
    ).not.toBeInTheDocument();
    const nonCompany = screen.getByText('Non-equity & unclassified');
    expect(nonCompany.parentElement).toHaveTextContent('60.0%');
    expect(screen.getByText('Undisclosed').parentElement)
      .toHaveTextContent('10.0%');
    expect(screen.getByText('Everything else').parentElement)
      .toHaveTextContent('0.0%');
  });

  it('omits the non-equity legend when there are none', () => {
    render(<ConcentrationBar allocations={[row('AAPL', 'security', 1)]} />);

    expect(
      screen.queryByText('Non-equity & unclassified'),
    ).not.toBeInTheDocument();
  });
});
