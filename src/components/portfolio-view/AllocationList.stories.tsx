import type { Meta, StoryObj } from '@storybook/react-vite';
import { AllocationList } from './AllocationList';
import type { FlattenedAllocation } from '../../domain/types';

const SAMPLE_ALLOCATIONS: FlattenedAllocation[] = [
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
    components: [
      {
        fromTicker: 'GOOG',
        valueCents: 150000,
        effectiveShares: 10,
      },
      {
        fromTicker: 'TECH_ETF',
        valueCents: 50000,
        effectiveShares: 3.333,
      },
    ],
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
    components: [
      {
        fromTicker: 'TECH_ETF',
        valueCents: 200000,
        effectiveShares: 5,
      },
    ],
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
      {
        ...SAMPLE_ALLOCATIONS[0],
        percentage: 0.35,
      },
      {
        ...SAMPLE_ALLOCATIONS[1],
        percentage: 0.35,
      },
      {
        ticker: 'Unknown (From PARTIAL_ETF)',
        effectiveShares: 0,
        totalValueCents: 80000,
        percentage: 0.3,
        tags: [],
        components: [
          {
            fromTicker: 'PARTIAL_ETF',
            valueCents: 80000,
            effectiveShares: 0,
          },
        ],
        isUnknown: true,
      },
    ],
    tagBreakdown: [],
  },
};

export const WithTinyAllocations: Story = {
  args: {
    viewMode: { kind: 'securities' },
    allocations: [
      ...SAMPLE_ALLOCATIONS.map((a, i) => ({
        ...a,
        percentage: i === 0 ? 0.9997 : 0.0001,
      })),
      {
        ticker: 'TINY_A',
        effectiveShares: 0.001,
        totalValueCents: 5,
        percentage: 0.00005,
        tags: [],
        components: [],
        isUnknown: false,
      },
      {
        ticker: 'TINY_B',
        effectiveShares: 0.0001,
        totalValueCents: 1,
        percentage: 0.00005,
        tags: [],
        components: [],
        isUnknown: false,
      },
      {
        ticker: 'TINY_C',
        effectiveShares: 0.00005,
        totalValueCents: 1,
        percentage: 0.00002,
        tags: [],
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
