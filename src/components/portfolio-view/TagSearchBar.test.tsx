import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagSearchBar } from './TagSearchBar';
import type { FlattenedAllocation } from '../../domain/types';

const ALLOCATIONS: FlattenedAllocation[] = [
  {
    ticker: 'GOOG',
    effectiveShares: 10,
    totalValueCents: 150000,
    percentage: 0.6,
    isUnknown: false,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
      {
        key: 'sector',
        name: 'Sector',
        value: 'Technology',
      },
    ],
    components: [],
  },
];

describe('TagSearchBar', () => {
  it('renders autocomplete input', () => {
    render(
      <TagSearchBar
        allocations={ALLOCATIONS}
        viewMode={{ kind: 'securities' }}
        onViewModeChange={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText('Group by tag'),
    ).toBeInTheDocument();
  });

  it('shows tag options from allocations', async () => {
    const user = userEvent.setup();
    render(
      <TagSearchBar
        allocations={ALLOCATIONS}
        viewMode={{ kind: 'securities' }}
        onViewModeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('Group by tag'));

    expect(
      screen.getByText('Market Capitalisation'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sector'),
    ).toBeInTheDocument();
  });

  it(
    'calls onViewModeChange when tag selected',
    async () => {
      const onViewModeChange = vi.fn();
      const user = userEvent.setup();
      render(
        <TagSearchBar
          allocations={ALLOCATIONS}
          viewMode={{ kind: 'securities' }}
          onViewModeChange={onViewModeChange}
        />,
      );

      await user.click(
        screen.getByLabelText('Group by tag'),
      );
      await user.click(
        screen.getByText('Market Capitalisation'),
      );

      expect(onViewModeChange).toHaveBeenCalledWith({
        kind: 'tag',
        tagKey: 'market_cap',
        tagName: 'Market Capitalisation',
      });
    },
  );
});
