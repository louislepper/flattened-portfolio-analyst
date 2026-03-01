import type { Meta, StoryObj } from '@storybook/react-vite';
import { AllocationList } from './AllocationList';

const SAMPLE_ALLOCATIONS = [
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
    isUnknown: false,
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
    isUnknown: false,
  },
];

const meta: Meta<typeof AllocationList> = {
  title: 'PortfolioView/AllocationList',
  component: AllocationList,
};

export default meta;
type Story = StoryObj<typeof AllocationList>;

export const Securities: Story = {
  args: {
    viewMode: { kind: 'securities' },
    allocations: SAMPLE_ALLOCATIONS,
    tagBreakdown: [],
  },
};

export const WithUnknownEntries: Story = {
  args: {
    viewMode: { kind: 'securities' },
    allocations: [
      ...SAMPLE_ALLOCATIONS,
      {
        ticker: 'Unknown (From PARTIAL_ETF)',
        effectiveShares: 0,
        totalValueCents: 80000,
        percentage: 0.15,
        tags: [],
        components: [],
        isUnknown: true,
      },
    ],
    tagBreakdown: [],
  },
};

export const TagBreakdown: Story = {
  args: {
    viewMode: {
      kind: 'tag',
      tagKey: 'market_cap',
      tagName: 'Market Capitalisation',
    },
    allocations: SAMPLE_ALLOCATIONS,
    tagBreakdown: [
      {
        tagValue: 'Large Cap',
        totalValueCents: 400000,
        percentage: 1.0,
      },
    ],
  },
};
