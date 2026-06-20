import type { Meta, StoryObj } from '@storybook/react-vite';
import { AllocationList } from './AllocationList';
import type { FlattenedAllocation } from '../../domain/types';

const SAMPLE_ALLOCATIONS: FlattenedAllocation[] = [
  {
    ticker: 'GOOG',
    shareCount: 10,
    valueCentsFromComponents: 50000,
    totalValueCents: 200000,
    percentage: 0.5,
    price: 15000,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
    ],
    tagsLoaded: true,
    components: [
      {
        fromTicker: 'GOOG',
        valueCents: 150000,
      },
      {
        fromTicker: 'TECH_ETF',
        valueCents: 50000,
      },
    ],
    isUnknown: false,
  },
  {
    ticker: 'MSFT',
    shareCount: 0,
    valueCentsFromComponents: 200000,
    totalValueCents: 200000,
    percentage: 0.5,
    price: 40000,
    tags: [
      {
        key: 'market_cap',
        name: 'Market Capitalisation',
        value: 'Large Cap',
      },
    ],
    tagsLoaded: true,
    components: [
      {
        fromTicker: 'TECH_ETF',
        valueCents: 200000,
      },
    ],
    isUnknown: false,
  },
];

function makeManyAllocations(
  count: number,
): FlattenedAllocation[] {
  // Descending weights so percentages roughly sum to 1, mirroring the
  // real (sorted-by-percentage) ordering from the aggregation layer.
  const weights = Array.from(
    { length: count },
    (_, i) => count - i,
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  return weights.map((weight, i) => {
    const percentage = weight / totalWeight;
    const totalValueCents = weight * 10000;
    return {
      ticker: `TICK${String(i + 1).padStart(3, '0')}`,
      shareCount: weight,
      valueCentsFromComponents: 0,
      totalValueCents,
      percentage,
      price: 10000,
      tags: [],
      tagsLoaded: true,
      components: [],
      isUnknown: false,
    };
  });
}

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
        shareCount: 0,
        valueCentsFromComponents: 80000,
        totalValueCents: 80000,
        percentage: 0.3,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [
          {
            fromTicker: 'PARTIAL_ETF',
            valueCents: 80000,
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
        valueCentsFromComponents: 1,
        totalValueCents: 1,
        percentage: 0.00005,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: false,
      },
      {
        ticker: 'TINY_C',
        shareCount: 0,
        valueCentsFromComponents: 1,
        totalValueCents: 1,
        percentage: 0.00002,
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

export const ManyTickers: Story = {
  args: {
    viewMode: { kind: 'securities' },
    allocations: makeManyAllocations(100),
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
