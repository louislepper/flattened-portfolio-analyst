import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagSearchBar } from './TagSearchBar';

const ALLOCATIONS = [
  {
    ticker: 'GOOG',
    effectiveShares: 10,
    totalValueCents: 150000,
    percentage: 0.6,
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

const meta: Meta<typeof TagSearchBar> = {
  title: 'PortfolioView/TagSearchBar',
  component: TagSearchBar,
  args: {
    onViewModeChange: fn(),
    allocations: ALLOCATIONS,
  },
};

export default meta;
type Story = StoryObj<typeof TagSearchBar>;

export const NoSelection: Story = {
  args: {
    viewMode: { kind: 'securities' },
  },
};

export const TagSelected: Story = {
  args: {
    viewMode: {
      kind: 'tag',
      tagKey: 'market_cap',
      tagName: 'Market Capitalisation',
    },
  },
};
