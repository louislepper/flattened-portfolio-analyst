import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { PortfolioProvider } from './PortfolioContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { server } from '../mocks/server';
import { SECURITY_ENDPOINT } from '../api/endpoints';
import { MOCK_SECURITIES } from '../mocks/fixtures';
import type { CompositeSecurity, SecurityResponse } from '../api/types';
import type { Holding } from '../domain/types';

const REFRESHED_AT = '2026-03-01T00:00:00Z';
const TEST_ETF = 'TEST_ETF';
const ENDPOINT = `${SECURITY_ENDPOINT}/:ticker`;
// The context retries after a short delay; leave room for it.
const SETTLE_TIMEOUT = { timeout: 4000 };

function TestConsumer({ holdings }: { readonly holdings: readonly Holding[] }) {
  const { state, addHoldings, analyzePortfolio, reset } = usePortfolio();
  return (
    <div>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="load-status">{state.constituentLoadStatus}</span>
      <span data-testid="lookup-count">{state.constituentLookupCount}</span>
      <span data-testid="failed-constituents">
        {[...state.failedConstituentTickers].sort().join(',')}
      </span>
      <span data-testid="loaded-constituents">
        {[...state.compositeSecurityData.keys()].sort().join(',')}
      </span>
      <button onClick={() => addHoldings(holdings)} data-testid="add" />
      <button onClick={() => { analyzePortfolio(); }} data-testid="analyze" />
      <button onClick={reset} data-testid="reset" />
    </div>
  );
}

async function analyze(holdings: readonly Holding[]) {
  const user = userEvent.setup();
  render(
    <PortfolioProvider>
      <TestConsumer holdings={holdings} />
    </PortfolioProvider>,
  );
  await user.click(screen.getByTestId('add'));
  await user.click(screen.getByTestId('analyze'));
  await waitFor(() => {
    expect(screen.getByTestId('phase')).toHaveTextContent('results');
  });
  return { user };
}

function stock(ticker: string): SecurityResponse {
  return { ...MOCK_SECURITIES.GOOG, ticker };
}

function equity(ticker: string): CompositeSecurity {
  return {
    ticker,
    isin: null,
    percentage: 0.01,
    refreshedAt: REFRESHED_AT,
    kind: 'equity',
  };
}

/** Serves TEST_ETF with the given constituents. */
function serveTestEtf(compositeSecurities: CompositeSecurity[]) {
  server.use(
    http.get(`${SECURITY_ENDPOINT}/${TEST_ETF}`, () =>
      HttpResponse.json({
        ...MOCK_SECURITIES.TECH_ETF,
        ticker: TEST_ETF,
        compositeSecurities,
      }),
    ),
  );
}

/**
 * Records every security request. Registered last so it sees requests first;
 * it returns nothing, so each request falls through to the real handlers.
 */
function recordRequests(): string[] {
  const requested: string[] = [];
  server.use(
    http.get(ENDPOINT, ({ params }) => {
      requested.push(params.ticker as string);
    }),
  );
  return requested;
}

const constituentRequests = (
  requested: readonly string[],
  holdings: readonly Holding[],
) => requested.filter((t) => !holdings.some((h) => h.ticker === t));

describe('PortfolioContext constituent loading', () => {
  it('is idle before any analysis', () => {
    render(
      <PortfolioProvider>
        <TestConsumer holdings={[]} />
      </PortfolioProvider>,
    );
    expect(screen.getByTestId('load-status')).toHaveTextContent('idle');
  });

  it('is complete straight away for a portfolio of stocks', async () => {
    const requested = recordRequests();
    await analyze([{ ticker: 'GOOG', quantity: 1 }]);

    expect(screen.getByTestId('load-status')).toHaveTextContent('complete');
    expect(screen.getByTestId('lookup-count')).toHaveTextContent('0');
    expect(requested).toEqual(['GOOG']);
  });

  it('looks up only equity constituents', async () => {
    const requested = recordRequests();
    const holdings = [{ ticker: 'BOND_ETF', quantity: 1 }];
    await analyze(holdings);

    await waitFor(() => {
      expect(screen.getByTestId('load-status')).toHaveTextContent('complete');
    });
    expect(screen.getByTestId('lookup-count')).toHaveTextContent('1');
    expect(constituentRequests(requested, holdings)).toEqual(['AAPL']);
    expect(screen.getByTestId('loaded-constituents')).toHaveTextContent('AAPL');
    expect(screen.getByTestId('failed-constituents')).toBeEmptyDOMElement();
  });

  it(
    'treats legacy constituents as equity, except UNKNOWN and non-tickers, '
    + 'and records failures once settled',
    async () => {
      server.use(
        http.get(`${SECURITY_ENDPOINT}/SLOWCO`, () =>
          HttpResponse.json(MOCK_SECURITIES.SLOWCO),
        ),
      );
      const requested = recordRequests();
      const holdings = [{ ticker: 'LEGACY_ETF', quantity: 1 }];
      await analyze(holdings);

      await waitFor(() => {
        expect(screen.getByTestId('load-status'))
          .toHaveTextContent('complete');
      }, SETTLE_TIMEOUT);

      const lookups = constituentRequests(requested, holdings);
      expect([...new Set(lookups)].sort()).toEqual(
        ['FLAKYCO', 'GOOG', 'MISSINGCO', 'SLOWCO'],
      );
      // 503 retried exactly once; 404 never retried.
      expect(lookups.filter((t) => t === 'FLAKYCO')).toHaveLength(2);
      expect(lookups.filter((t) => t === 'MISSINGCO')).toHaveLength(1);
      expect(lookups.filter((t) => t === 'GOOG')).toHaveLength(1);
      expect(screen.getByTestId('failed-constituents'))
        .toHaveTextContent('FLAKYCO,MISSINGCO');
      expect(screen.getByTestId('loaded-constituents'))
        .toHaveTextContent('GOOG,SLOWCO');
    },
  );

  it('recovers a constituent whose first lookup fails transiently', async () => {
    serveTestEtf([equity('BLIPCO'), equity('GONECO')]);
    let blipCalls = 0;
    server.use(
      http.get(`${SECURITY_ENDPOINT}/BLIPCO`, () => {
        blipCalls += 1;
        return blipCalls === 1
          ? HttpResponse.json({}, { status: 503 })
          : HttpResponse.json(stock('BLIPCO'));
      }),
      http.get(`${SECURITY_ENDPOINT}/GONECO`, () =>
        HttpResponse.json({}, { status: 429 }),
      ),
    );
    await analyze([{ ticker: TEST_ETF, quantity: 1 }]);

    await waitFor(() => {
      expect(screen.getByTestId('load-status')).toHaveTextContent('complete');
    }, SETTLE_TIMEOUT);
    expect(blipCalls).toBe(2);
    expect(screen.getByTestId('loaded-constituents')).toHaveTextContent('BLIPCO');
    expect(screen.getByTestId('failed-constituents')).toHaveTextContent('GONECO');
  });

  it('stops loading and discards results on reset', async () => {
    const tickers = Array.from({ length: 25 }, (_, i) => `C${i}`);
    serveTestEtf(tickers.map(equity));
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(
      http.get(ENDPOINT, async ({ params }) => {
        const ticker = params.ticker as string;
        if (!ticker.startsWith('C')) return undefined;
        await gate;
        return HttpResponse.json(stock(ticker));
      }),
    );
    const requested = recordRequests();
    const { user } = await analyze([{ ticker: TEST_ETF, quantity: 1 }]);

    expect(screen.getByTestId('load-status')).toHaveTextContent('loading');
    expect(screen.getByTestId('lookup-count')).toHaveTextContent('25');
    await waitFor(() => {
      expect(requested.filter((t) => t.startsWith('C'))).toHaveLength(20);
    });

    await user.click(screen.getByTestId('reset'));
    release();
    // Give the released first batch time to settle (and, if the loop were
    // not cancelled, to request the second batch).
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.getByTestId('phase')).toHaveTextContent('input');
    expect(screen.getByTestId('load-status')).toHaveTextContent('idle');
    expect(screen.getByTestId('loaded-constituents')).toBeEmptyDOMElement();
    expect(requested.filter((t) => t.startsWith('C'))).toHaveLength(20);
  });

  it('loads constituents in batches and finishes after the last', async () => {
    const tickers = Array.from({ length: 45 }, (_, i) => `B${i}`);
    serveTestEtf(tickers.map(equity));
    server.use(
      http.get(ENDPOINT, ({ params }) => {
        const ticker = params.ticker as string;
        return ticker.startsWith('B')
          ? HttpResponse.json(stock(ticker))
          : undefined;
      }),
    );
    await analyze([{ ticker: TEST_ETF, quantity: 1 }]);

    await waitFor(() => {
      expect(screen.getByTestId('load-status')).toHaveTextContent('complete');
    });
    expect(
      screen.getByTestId('loaded-constituents').textContent?.split(','),
    ).toHaveLength(45);
  });

  it('clears earlier failures when the portfolio is analysed again', async () => {
    serveTestEtf([equity('GONECO')]);
    const { user } = await analyze([{ ticker: TEST_ETF, quantity: 1 }]);
    await waitFor(() => {
      expect(screen.getByTestId('failed-constituents'))
        .toHaveTextContent('GONECO');
    });

    server.use(
      http.get(`${SECURITY_ENDPOINT}/GONECO`, () =>
        HttpResponse.json(stock('GONECO')),
      ),
    );
    await user.click(screen.getByTestId('analyze'));

    await waitFor(() => {
      expect(screen.getByTestId('loaded-constituents'))
        .toHaveTextContent('GONECO');
    });
    expect(screen.getByTestId('failed-constituents')).toBeEmptyDOMElement();
    expect(screen.getByTestId('load-status')).toHaveTextContent('complete');
  });
});

describe('PortfolioContext holding lookups', () => {
  it('retries a holding once after a transient failure', async () => {
    let calls = 0;
    server.use(
      http.get(`${SECURITY_ENDPOINT}/GOOG`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({}, { status: 503 })
          : HttpResponse.json(MOCK_SECURITIES.GOOG);
      }),
    );
    render(
      <PortfolioProvider>
        <TestConsumer holdings={[{ ticker: 'GOOG', quantity: 1 }]} />
      </PortfolioProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId('add'));
    await user.click(screen.getByTestId('analyze'));

    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('results');
    }, SETTLE_TIMEOUT);
    expect(calls).toBe(2);
  });
});

