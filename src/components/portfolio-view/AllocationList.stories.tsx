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
    tagStatus: 'loaded',
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
    kind: 'security',
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
    tagStatus: 'loaded',
    components: [
      {
        fromTicker: 'TECH_ETF',
        valueCents: 200000,
      },
    ],
    kind: 'security',
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
        shareCount: 0,
        valueCentsFromComponents: 80000,
        totalValueCents: 80000,
        percentage: 0.3,
        price: null,
        tags: [],
        tagStatus: 'loaded',
        components: [
          {
            fromTicker: 'PARTIAL_ETF',
            valueCents: 80000,
          },
        ],
        kind: 'unknown',
      },
    ],
    tagBreakdown: [],
  },
};

const aggregateRow = (
  ticker: string,
  kind: FlattenedAllocation['kind'],
  valueCents: number,
  percentage: number,
): FlattenedAllocation => ({
  ticker,
  kind,
  shareCount: 0,
  valueCentsFromComponents: valueCents,
  totalValueCents: valueCents,
  percentage,
  price: null,
  tags: [],
  tagStatus: 'loaded',
  components: [{ fromTicker: 'GOVI', valueCents }],
});

export const WithNonEquityAndUnclassified: Story = {
  args: {
    viewMode: { kind: 'securities' },
    allocations: [
      aggregateRow('Non-equity holdings (from GOVI)', 'non-equity', 120000, 0.4),
      { ...SAMPLE_ALLOCATIONS[0], percentage: 0.3 },
      { ...SAMPLE_ALLOCATIONS[1], percentage: 0.2 },
      aggregateRow('Unclassified holdings (from GOVI)', 'unresolved', 30000, 0.1),
    ],
    tagBreakdown: [],
  },
};

export const TagBreakdownWithLoadBuckets: Story = {
  args: {
    viewMode: { kind: 'tag', tagKey: 'sector', tagName: 'Sector' },
    allocations: [],
    tagBreakdown: [
      { tagValue: 'Technology', totalValueCents: 40000, percentage: 0.4 },
      {
        tagValue: 'Non-equity (bonds, cash, futures)',
        totalValueCents: 20000,
        percentage: 0.2,
      },
      { tagValue: 'Unknown - loading', totalValueCents: 15000, percentage: 0.15 },
      { tagValue: 'Unclassified', totalValueCents: 10000, percentage: 0.1 },
      { tagValue: 'No data', totalValueCents: 10000, percentage: 0.1 },
      { tagValue: 'Untagged', totalValueCents: 5000, percentage: 0.05 },
    ],
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
        tagStatus: 'loaded',
        components: [],
        kind: 'security',
      },
      {
        ticker: 'TINY_B',
        shareCount: 0,
        valueCentsFromComponents: 1,
        totalValueCents: 1,
        percentage: 0.00005,
        price: null,
        tags: [],
        tagStatus: 'loaded',
        components: [],
        kind: 'security',
      },
      {
        ticker: 'TINY_C',
        shareCount: 0,
        valueCentsFromComponents: 1,
        totalValueCents: 1,
        percentage: 0.00002,
        price: null,
        tags: [],
        tagStatus: 'loaded',
        components: [],
        kind: 'security',
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
