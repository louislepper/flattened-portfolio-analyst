import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioView, TagLoadingNote } from './PortfolioView';
import {
  PortfolioContext,
  type PortfolioContextValue,
  type PortfolioState,
} from '../../context/portfolioContextValue';
import type {
  CompositeSecurity,
  ConstituentKind,
  SecurityResponse,
} from '../../api/types';
import type { ViewMode } from '../../domain/types';

const REFRESHED_AT = '2026-03-01T00:00:00Z';
const SECTOR_VIEW: ViewMode = {
  kind: 'tag',
  tagKey: 'sector',
  tagName: 'Sector',
};
const LOADING_NOTE_ID = 'tag-loading-note';

function security(
  ticker: string,
  overrides: Partial<SecurityResponse> = {},
): SecurityResponse {
  return {
    ticker,
    isin: null,
    type: 'stock',
    tags: [],
    price: 1000,
    compositeSecurities: [],
    refreshedAt: REFRESHED_AT,
    ...overrides,
  };
}

function sectorStock(ticker: string, sector: string): SecurityResponse {
  return security(ticker, {
    tags: [{ key: 'sector', name: 'Sector', value: sector }],
  });
}

function constituent(
  ticker: string,
  percentage: number,
  kind?: ConstituentKind,
): CompositeSecurity {
  return {
    ticker,
    isin: null,
    percentage,
    refreshedAt: REFRESHED_AT,
    ...(kind ? { kind } : {}),
  };
}

// FUND ($1,000): AAPL 40% (loaded), MSFT 20% (pending or loaded),
// GONE 10% (failed or pending), bonds 20%, unclassified 10%.
const FUND = security('FUND', {
  type: 'etf',
  price: 100000,
  compositeSecurities: [
    constituent('AAPL', 0.4, 'equity'),
    constituent('MSFT', 0.2, 'equity'),
    constituent('GONE', 0.1, 'equity'),
    constituent('T', 0.2, 'non-equity'),
    constituent('XS1', 0.1, 'unresolved'),
  ],
});

function baseState(overrides: Partial<PortfolioState> = {}): PortfolioState {
  return {
    holdings: [{ ticker: 'FUND', quantity: 1 }],
    securityData: new Map([['FUND', FUND]]),
    compositeSecurityData: new Map([
      ['AAPL', sectorStock('AAPL', 'Technology')],
    ]),
    phase: 'results',
    errorMessage: null,
    failedTickers: [],
    constituentLoadStatus: 'loading',
    constituentLookupCount: 3,
    failedConstituentTickers: new Set(),
    viewMode: SECTOR_VIEW,
    ...overrides,
  };
}

function contextValue(state: PortfolioState): PortfolioContextValue {
  return {
    state,
    addHolding: vi.fn(),
    addHoldings: vi.fn(),
    removeHolding: vi.fn(),
    clearHoldings: vi.fn(),
    analyzePortfolio: vi.fn(),
    setViewMode: vi.fn(),
    reset: vi.fn(),
  };
}

function renderView(state: PortfolioState) {
  const view = render(
    <PortfolioContext.Provider value={contextValue(state)}>
      <PortfolioView />
    </PortfolioContext.Provider>,
  );
  const rerenderWith = (next: PortfolioState) => view.rerender(
    <PortfolioContext.Provider value={contextValue(next)}>
      <PortfolioView />
    </PortfolioContext.Provider>,
  );
  return { ...view, rerenderWith };
}

describe('PortfolioView tag loading indicator', () => {
  it('shows the by-value share of loaded tags while loading', () => {
    renderView(baseState());

    // Pending: MSFT 20% + GONE 10% of value, so 70% has settled.
    const note = screen.getByTestId(LOADING_NOTE_ID);
    expect(note).toHaveTextContent('split is provisional');
    expect(note).toHaveTextContent('tags loaded for 70% of portfolio value');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '70',
    );
  });

  it('moves as lookups settle and disappears when loading finishes', () => {
    const { rerenderWith } = renderView(baseState());

    rerenderWith(baseState({
      compositeSecurityData: new Map([
        ['AAPL', sectorStock('AAPL', 'Technology')],
        ['MSFT', sectorStock('MSFT', 'Technology')],
      ]),
    }));
    expect(screen.getByTestId(LOADING_NOTE_ID))
      .toHaveTextContent('tags loaded for 90% of portfolio value');

    rerenderWith(baseState({
      compositeSecurityData: new Map([
        ['AAPL', sectorStock('AAPL', 'Technology')],
        ['MSFT', sectorStock('MSFT', 'Technology')],
      ]),
      failedConstituentTickers: new Set(['GONE']),
      constituentLoadStatus: 'complete',
    }));
    expect(screen.queryByTestId(LOADING_NOTE_ID)).not.toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('is not shown on the holdings tab', () => {
    renderView(baseState({ viewMode: { kind: 'securities' } }));

    expect(screen.queryByTestId(LOADING_NOTE_ID)).not.toBeInTheDocument();
  });

  it('never rounds up to 100% while something is pending', () => {
    render(<TagLoadingNote loadedShare={0.999} />);

    expect(screen.getByTestId(LOADING_NOTE_ID))
      .toHaveTextContent('tags loaded for 99% of portfolio value');
  });

  it('shows 0% when nothing has loaded yet', () => {
    render(<TagLoadingNote loadedShare={0} />);

    expect(screen.getByTestId(LOADING_NOTE_ID))
      .toHaveTextContent('tags loaded for 0% of portfolio value');
  });
});

describe('PortfolioView tag buckets', () => {
  it('renders loading, no-data, non-equity and unclassified buckets', () => {
    renderView(baseState({
      failedConstituentTickers: new Set(['GONE']),
    }));

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Unknown - loading')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(
      screen.getByText('Non-equity (bonds, cash, futures)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Unclassified')).toBeInTheDocument();
  });
});

describe('PortfolioView companies count', () => {
  it('counts only real securities, not aggregates or failed lookups', () => {
    renderView(baseState({
      viewMode: { kind: 'securities' },
      failedConstituentTickers: new Set(['GONE']),
      constituentLoadStatus: 'complete',
    }));

    // AAPL and MSFT; not GONE, the bond row or the unclassified row.
    expect(
      screen.getByText('2 companies across your funds'),
    ).toBeInTheDocument();
  });
});

describe('PortfolioView failed holdings banner', () => {
  it('says unpriced holdings are excluded from the total and percentages', () => {
    renderView(baseState({
      holdings: [
        { ticker: 'FUND', quantity: 1 },
        { ticker: 'ZZZZ', quantity: 5 },
      ],
      failedTickers: ['ZZZZ'],
    }));

    const banner = screen.getByTestId('failed-holdings');
    expect(banner).toHaveTextContent(
      'Excluded from the total and all percentages because no price is '
      + 'available: ZZZZ.',
    );
    expect(banner).not.toHaveTextContent('Shown as single securities');
  });

  it('separates CSV-priced holdings, which are shown unflattened', () => {
    renderView(baseState({
      holdings: [
        { ticker: 'FUND', quantity: 1 },
        { ticker: 'ZZZZ', quantity: 5 },
        { ticker: 'YYYY', quantity: 2 },
        { ticker: 'PRICED', quantity: 3, overridePrice: 1000 },
      ],
      securityData: new Map([
        ['FUND', FUND],
        ['PRICED', security('PRICED')],
      ]),
      failedTickers: ['ZZZZ', 'YYYY', 'PRICED'],
    }));

    const banner = screen.getByTestId('failed-holdings');
    expect(banner).toHaveTextContent(
      'available: ZZZZ, YYYY.',
    );
    expect(banner).toHaveTextContent(
      'Shown as single securities at the price in your CSV and not '
      + 'flattened: PRICED.',
    );
  });

  it('is absent when every holding loaded', () => {
    renderView(baseState());

    expect(screen.queryByTestId('failed-holdings')).not.toBeInTheDocument();
  });
});
