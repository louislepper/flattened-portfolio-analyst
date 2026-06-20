import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllocationList } from './AllocationList';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';

const ALLOCATIONS: FlattenedAllocation[] = [
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

const TAG_BREAKDOWN: TagBreakdownEntry[] = [
  {
    tagValue: 'Large Cap',
    totalValueCents: 400000,
    percentage: 1.0,
  },
];

function makeManyAllocations(
  count: number,
): FlattenedAllocation[] {
  const weights = Array.from(
    { length: count },
    (_, i) => count - i,
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  return weights.map((weight, i) => ({
    ticker: `TICK${String(i + 1).padStart(3, '0')}`,
    shareCount: weight,
    valueCentsFromComponents: 0,
    totalValueCents: weight * 10000,
    percentage: weight / totalWeight,
    price: 10000,
    tags: [],
    tagsLoaded: true,
    components: [],
    isUnknown: false,
  }));
}

describe('AllocationList', () => {
  it('renders securities table in securities mode', () => {
    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={ALLOCATIONS}
        tagBreakdown={[]}
      />,
    );

    expect(screen.getByText('Ticker')).toBeInTheDocument();
    expect(screen.getByText('Shares')).toBeInTheDocument();
    expect(screen.getByText('GOOG')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getAllByText('50.0%')).toHaveLength(2);
  });

  it('renders tag breakdown table in tag mode', () => {
    render(
      <AllocationList
        viewMode={{
          kind: 'tag',
          tagKey: 'market_cap',
          tagName: 'Market Capitalisation',
        }}
        allocations={ALLOCATIONS}
        tagBreakdown={TAG_BREAKDOWN}
      />,
    );

    expect(
      screen.getByText('Market Capitalisation'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Large Cap'),
    ).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('shows total portfolio value', () => {
    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={ALLOCATIONS}
        tagBreakdown={[]}
      />,
    );

    const total = screen.getByTestId('total-value');
    expect(total).toHaveTextContent('$4000.00');
  });

  it('shows dash for shares on unknown entries', () => {
    const withUnknown: FlattenedAllocation[] = [
      ...ALLOCATIONS,
      {
        ticker: 'Unknown (From PARTIAL_ETF)',
        shareCount: 0,
        valueCentsFromComponents: 80000,
        totalValueCents: 80000,
        percentage: 0.2,
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
    ];
    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={withUnknown}
        tagBreakdown={[]}
      />,
    );

    expect(
      screen.getByText('Unknown (From PARTIAL_ETF)'),
    ).toBeInTheDocument();
    const unknownRow = screen
      .getByText('Unknown (From PARTIAL_ETF)')
      .closest('tr')!;
    expect(unknownRow).toHaveTextContent('-');
    expect(unknownRow).toHaveTextContent('$800.00');
    expect(unknownRow).toHaveTextContent('20.0%');
  });

  it('shows dash for shares when price is null', () => {
    const withNullPrice: FlattenedAllocation[] = [
      {
        ticker: 'LOADING_STOCK',
        shareCount: 0,
        valueCentsFromComponents: 100000,
        totalValueCents: 100000,
        percentage: 1.0,
        price: null,
        tags: [],
        tagsLoaded: false,
        components: [
          {
            fromTicker: 'ETF',
            valueCents: 100000,
          },
        ],
        isUnknown: false,
      },
    ];
    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={withNullPrice}
        tagBreakdown={[]}
      />,
    );

    const row = screen
      .getByText('LOADING_STOCK')
      .closest('tr')!;
    expect(row).toHaveTextContent('-');
  });

  it('formats dollar values correctly', () => {
    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={ALLOCATIONS}
        tagBreakdown={[]}
      />,
    );

    expect(
      screen.getAllByText('$2000.00'),
    ).toHaveLength(2);
  });

  it(
    'computes shares from totalValueCents / price',
    () => {
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={ALLOCATIONS}
          tagBreakdown={[]}
        />,
      );

      // GOOG: 200000 / 15000 = 13.33
      const googRow = screen
        .getByText('GOOG')
        .closest('tr')!;
      expect(googRow).toHaveTextContent('13.33');

      // MSFT: 200000 / 40000 = 5.00
      const msftRow = screen
        .getByText('MSFT')
        .closest('tr')!;
      expect(msftRow).toHaveTextContent('5.00');
    },
  );

  it(
    'hides tiny allocations and shows everything else row',
    () => {
      const withTiny: FlattenedAllocation[] = [
        {
          ticker: 'GOOG',
          shareCount: 100,
          valueCentsFromComponents: 0,
          totalValueCents: 1000000,
          percentage: 0.999,
          price: 10000,
          tags: [],
          tagsLoaded: true,
          components: [],
          isUnknown: false,
        },
        {
          ticker: 'TINY_A',
          shareCount: 0,
          valueCentsFromComponents: 5,
          totalValueCents: 5,
          percentage: 0.00005,
          price: null,
          tags: [],
          tagsLoaded: false,
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
          tagsLoaded: false,
          components: [],
          isUnknown: false,
        },
      ];

      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={withTiny}
          tagBreakdown={[]}
        />,
      );

      expect(
        screen.getByText('GOOG'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('TINY_A'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('TINY_B'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/Everything else/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/2 securities/),
      ).toBeInTheDocument();
    },
  );

  it(
    'does not show everything else row when nothing is hidden',
    () => {
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={ALLOCATIONS}
          tagBreakdown={[]}
        />,
      );

      expect(
        screen.queryByText(/Everything else/),
      ).not.toBeInTheDocument();
    },
  );

  it('shows unknown percentage note when unknowns exist', () => {
    const withUnknown: FlattenedAllocation[] = [
      {
        ticker: 'GOOG',
        shareCount: 10,
        valueCentsFromComponents: 0,
        totalValueCents: 100000,
        percentage: 0.6,
        price: 10000,
        tags: [],
        tagsLoaded: true,
        components: [],
        isUnknown: false,
      },
      {
        ticker: 'Unknown (From ETF_A)',
        shareCount: 0,
        valueCentsFromComponents: 40000,
        totalValueCents: 40000,
        percentage: 0.4,
        price: null,
        tags: [],
        tagsLoaded: true,
        components: [
          {
            fromTicker: 'ETF_A',
            valueCents: 40000,
          },
        ],
        isUnknown: true,
      },
    ];

    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={withUnknown}
        tagBreakdown={[]}
      />,
    );

    const note = screen.getByTestId('unknown-note');
    expect(note).toHaveTextContent('40.0%');
    expect(note).toHaveTextContent('unknown holdings');
  });

  it(
    'does not show unknown note when no unknowns exist',
    () => {
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={ALLOCATIONS}
          tagBreakdown={[]}
        />,
      );

      expect(
        screen.queryByTestId('unknown-note'),
      ).not.toBeInTheDocument();
    },
  );

  it(
    'shows all rows without expanders at the split threshold',
    () => {
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={makeManyAllocations(40)}
          tagBreakdown={[]}
        />,
      );

      expect(screen.getByText('TICK001')).toBeInTheDocument();
      expect(screen.getByText('TICK040')).toBeInTheDocument();
      expect(
        screen.queryByTestId('show-more-top'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('show-more-bottom'),
      ).not.toBeInTheDocument();
    },
  );

  it(
    'shows the Holdings header and the shown/total count',
    () => {
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={makeManyAllocations(100)}
          tagBreakdown={[]}
        />,
      );

      expect(
        screen.getByRole('heading', { name: 'Holdings' }),
      ).toBeInTheDocument();
      // 35 top + 5 bottom shown out of 100
      expect(
        screen.getByText('Showing 40 of 100'),
      ).toBeInTheDocument();
    },
  );

  it(
    'shows the hidden-count label in the expander band',
    () => {
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={makeManyAllocations(100)}
          tagBreakdown={[]}
        />,
      );

      // 100 total - 35 top - 5 bottom = 60 hidden in the middle
      expect(
        screen.getByText('60 holdings hidden'),
      ).toBeInTheDocument();
    },
  );

  it(
    'splits into top 35 and bottom 5 with two expanders '
    + 'when over the threshold',
    () => {
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={makeManyAllocations(100)}
          tagBreakdown={[]}
        />,
      );

      // Top section: TICK001..TICK035
      expect(screen.getByText('TICK001')).toBeInTheDocument();
      expect(screen.getByText('TICK035')).toBeInTheDocument();
      // Middle is hidden
      expect(
        screen.queryByText('TICK036'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('TICK095'),
      ).not.toBeInTheDocument();
      // Bottom section: TICK096..TICK100
      expect(screen.getByText('TICK096')).toBeInTheDocument();
      expect(screen.getByText('TICK100')).toBeInTheDocument();

      expect(
        screen.getByTestId('show-more-top'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('show-more-bottom'),
      ).toBeInTheDocument();
    },
  );

  it(
    'reveals 10 more from the top when top expander clicked',
    async () => {
      const user = userEvent.setup();
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={makeManyAllocations(100)}
          tagBreakdown={[]}
        />,
      );

      expect(
        screen.queryByText('TICK036'),
      ).not.toBeInTheDocument();

      await user.click(screen.getByTestId('show-more-top'));

      // TICK036..TICK045 now visible, TICK046 still hidden
      expect(screen.getByText('TICK036')).toBeInTheDocument();
      expect(screen.getByText('TICK045')).toBeInTheDocument();
      expect(
        screen.queryByText('TICK046'),
      ).not.toBeInTheDocument();
    },
  );

  it(
    'reveals 10 more from the bottom when bottom expander clicked',
    async () => {
      const user = userEvent.setup();
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={makeManyAllocations(100)}
          tagBreakdown={[]}
        />,
      );

      expect(
        screen.queryByText('TICK095'),
      ).not.toBeInTheDocument();

      await user.click(screen.getByTestId('show-more-bottom'));

      // bottomCount grows to 15: TICK086..TICK095 now visible
      expect(screen.getByText('TICK091')).toBeInTheDocument();
      expect(screen.getByText('TICK086')).toBeInTheDocument();
      expect(
        screen.queryByText('TICK085'),
      ).not.toBeInTheDocument();
    },
  );

  it(
    'collapses expanders once sections cover the whole list',
    async () => {
      const user = userEvent.setup();
      // 45 securities: top 35 + bottom 5 leaves only 5 in the middle.
      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={makeManyAllocations(45)}
          tagBreakdown={[]}
        />,
      );

      // One top expansion (35 -> 45) plus the bottom 5 covers all 45.
      await user.click(screen.getByTestId('show-more-top'));

      expect(
        screen.queryByTestId('show-more-top'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('show-more-bottom'),
      ).not.toBeInTheDocument();
      // Every ticker is now visible.
      expect(screen.getByText('TICK036')).toBeInTheDocument();
      expect(screen.getByText('TICK045')).toBeInTheDocument();
    },
  );

  it(
    'shows component breakdown popover on row click',
    async () => {
      const user = userEvent.setup();

      render(
        <AllocationList
          viewMode={{ kind: 'securities' }}
          allocations={ALLOCATIONS}
          tagBreakdown={[]}
        />,
      );

      const googRow = screen.getByText('GOOG').closest('tr')!;
      await user.click(googRow);

      expect(
        screen.getByText('GOOG — Source Breakdown'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('TECH_ETF'),
      ).toBeInTheDocument();

      // GOOG direct: 150000 / 200000 = 75%
      expect(screen.getByText('75.0%')).toBeInTheDocument();
      // TECH_ETF: 50000 / 200000 = 25%
      expect(screen.getByText('25.0%')).toBeInTheDocument();
    },
  );
});
