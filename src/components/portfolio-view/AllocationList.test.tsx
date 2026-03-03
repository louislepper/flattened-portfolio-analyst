import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllocationList } from './AllocationList';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';

const ALLOCATIONS: FlattenedAllocation[] = [
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

const TAG_BREAKDOWN: TagBreakdownEntry[] = [
  {
    tagValue: 'Large Cap',
    totalValueCents: 400000,
    percentage: 1.0,
  },
];

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
        effectiveShares: 0,
        totalValueCents: 80000,
        percentage: 0.2,
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
    'hides tiny allocations and shows everything else row',
    () => {
      const withTiny: FlattenedAllocation[] = [
        {
          ticker: 'GOOG',
          effectiveShares: 100,
          totalValueCents: 1000000,
          percentage: 0.999,
          tags: [],
          components: [],
          isUnknown: false,
        },
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
          effectiveShares: 0.0005,
          totalValueCents: 3,
          percentage: 0.00003,
          tags: [],
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
        effectiveShares: 10,
        totalValueCents: 100000,
        percentage: 0.6,
        tags: [],
        components: [],
        isUnknown: false,
      },
      {
        ticker: 'Unknown (From ETF_A)',
        effectiveShares: 0,
        totalValueCents: 40000,
        percentage: 0.4,
        tags: [],
        components: [
          {
            fromTicker: 'ETF_A',
            valueCents: 40000,
            effectiveShares: 0,
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
