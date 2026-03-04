import type { Meta, StoryObj } from '@storybook/react-vite';
import { AllocationPieChart } from './AllocationPieChart';

const SAMPLE_ALLOCATIONS = [
  {
    ticker: 'GOOG',
    shareCount: 10,
    valueCentsFromComponents: 50000,
    totalValueCents: 200000,
    percentage: 0.5,
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
    totalValueCents: 200000,
    percentage: 0.3,
    price: 40000,
    tags: [],
    tagsLoaded: true,
    components: [],
    isUnknown: false,
  },
  {
    ticker: 'AAPL',
    shareCount: 3,
    valueCentsFromComponents: 0,
    totalValueCents: 80000,
    percentage: 0.2,
    price: 20000,
    tags: [],
    tagsLoaded: true,
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

export const WithEverythingElse: Story = {
  args: {
    viewMode: { kind: 'securities' },
    allocations: [
      ...SAMPLE_ALLOCATIONS,
      {
        ticker: 'TINY_A',
        shareCount: 0,
        valueCentsFromComponents: 5,
        totalValueCents: 5,
        percentage: 0.00005,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: false,
      },
      {
        ticker: 'TINY_B',
        shareCount: 0,
        valueCentsFromComponents: 3,
        totalValueCents: 3,
        percentage: 0.00003,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: false,
      },
    ],
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
