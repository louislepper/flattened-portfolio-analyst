import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TagSearchBar } from './TagSearchBar';

const ALLOCATIONS = [
  {
    ticker: 'GOOG',
    shareCount: 10,
    valueCentsFromComponents: 0,
    totalValueCents: 150000,
    percentage: 0.6,
    price: 15000,
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
    tagsLoaded: true,
    components: [],
    isUnknown: false,
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
