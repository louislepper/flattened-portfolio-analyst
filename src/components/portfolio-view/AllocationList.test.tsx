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
        shareCount: 0,
        valueCentsFromComponents: 80000,
        totalValueCents: 80000,
        percentage: 0.2,
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
        tagStatus: 'pending',
        components: [
          {
            fromTicker: 'ETF',
            valueCents: 100000,
          },
        ],
        kind: 'security',
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
          tagStatus: 'loaded',
          components: [],
          kind: 'security',
        },
        {
          ticker: 'TINY_A',
          shareCount: 0,
          valueCentsFromComponents: 5,
          totalValueCents: 5,
          percentage: 0.00005,
          price: null,
          tags: [],
          tagStatus: 'pending',
          components: [],
          kind: 'security',
        },
        {
          ticker: 'TINY_B',
          shareCount: 0,
          valueCentsFromComponents: 3,
          totalValueCents: 3,
          percentage: 0.00003,
          price: null,
          tags: [],
          tagStatus: 'pending',
          components: [],
          kind: 'security',
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
        tagStatus: 'loaded',
        components: [],
        kind: 'security',
      },
      {
        ticker: 'Unknown (From ETF_A)',
        shareCount: 0,
        valueCentsFromComponents: 40000,
        totalValueCents: 40000,
        percentage: 0.4,
        price: null,
        tags: [],
        tagStatus: 'loaded',
        components: [
          {
            fromTicker: 'ETF_A',
            valueCents: 40000,
          },
        ],
        kind: 'unknown',
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
  it('collapses tag groups past the first twelve into Everything else', async () => {
    const user = userEvent.setup();
    const breakdown: TagBreakdownEntry[] = Array.from({ length: 15 }, (_, i) => ({
      tagValue: `Country ${i + 1}`,
      totalValueCents: 1000,
      percentage: 0.01,
    }));
    render(
      <AllocationList
        viewMode={{ kind: 'tag', tagKey: 'country', tagName: 'Country' }}
        allocations={ALLOCATIONS}
        tagBreakdown={breakdown}
      />,
    );

    expect(screen.getByText('Country 12')).toBeInTheDocument();
    expect(screen.queryByText('Country 13')).not.toBeInTheDocument();
    const tail = screen.getByTestId('tag-tail');
    expect(tail).toHaveTextContent('Everything else');
    expect(tail).toHaveTextContent('3 groups');
    expect(tail).toHaveTextContent('3.0%');

    await user.click(screen.getByRole('button', { name: /show 10 more/i }));

    expect(screen.getByText('Country 15')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-tail')).not.toBeInTheDocument();
  });

  it('treats non-equity and unclassified rows as non-companies', () => {
    const row = (
      ticker: string,
      kind: FlattenedAllocation['kind'],
      percentage: number,
    ): FlattenedAllocation => ({
      ticker,
      kind,
      shareCount: 0,
      valueCentsFromComponents: percentage * 100000,
      totalValueCents: percentage * 100000,
      percentage,
      price: null,
      tags: [],
      tagStatus: 'loaded',
      components: [{ fromTicker: 'GOVI', valueCents: percentage * 100000 }],
    });
    const allocations: FlattenedAllocation[] = [
      row('Non-equity holdings (from GOVI)', 'non-equity', 0.5),
      { ...row('AAPL', 'security', 0.3), price: 1000 },
      row('Unclassified holdings (from GOVI)', 'unresolved', 0.2),
    ];

    render(
      <AllocationList
        viewMode={{ kind: 'securities' }}
        allocations={allocations}
        tagBreakdown={[]}
      />,
    );

    const table = screen.getByRole('table');
    const bondRow = screen
      .getByText('Non-equity holdings (from GOVI)')
      .closest('tr')!;
    expect(bondRow).toHaveTextContent('-');
    expect(table).toHaveTextContent('Unclassified holdings (from GOVI)');
    expect(screen.getByText('Distinct companies').parentElement)
      .toHaveTextContent('1');
    // Non-equity holdings are known allocations, not undisclosed ones.
    expect(screen.queryByTestId('unknown-note')).not.toBeInTheDocument();
  });
});
