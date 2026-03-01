import type { Meta, StoryObj } from '@storybook/react-vite';
import { AllocationPieChart } from './AllocationPieChart';

const SAMPLE_ALLOCATIONS = [
  {
    ticker: 'GOOG',
    effectiveShares: 13.333,
    totalValueCents: 200000,
    percentage: 0.5,
    tags: [],
    components: [],
    isUnknown: false,
  },
  {
    ticker: 'MSFT',
    effectiveShares: 5,
    totalValueCents: 200000,
    percentage: 0.3,
    tags: [],
    components: [],
    isUnknown: false,
  },
  {
    ticker: 'AAPL',
    effectiveShares: 3,
    totalValueCents: 80000,
    percentage: 0.2,
    tags: [],
    components: [],
    isUnknown: false,
  },
];

const meta: Meta<typeof AllocationPieChart> = {
  title: 'PortfolioView/AllocationPieChart',
  component: AllocationPieChart,
};

export default meta;
type Story = StoryObj<typeof AllocationPieChart>;

export const Securities: Story = {
  args: {
    viewMode: { kind: 'securities' },
    allocations: SAMPLE_ALLOCATIONS,
    tagBreakdown: [],
  },
};

export const TagBreakdown: Story = {
  args: {
    viewMode: {
      kind: 'tag',
      tagKey: 'sector',
      tagName: 'Sector',
    },
    allocations: [],
    tagBreakdown: [
      {
        tagValue: 'Technology',
        totalValueCents: 300000,
        percentage: 0.75,
      },
      {
        tagValue: 'Finance',
        totalValueCents: 100000,
        percentage: 0.25,
      },
    ],
  },
};
