import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  fetchSecurity,
  fetchSecurities,
  fetchSecurityWithRetry,
  isTransientError,
  ApiError,
} from './client';
import { server } from '../mocks/server';
import { SECURITY_ENDPOINT } from './endpoints';
import { MOCK_SECURITIES } from '../mocks/fixtures';

function captureRefreshHeader(): { value: string | null } {
  const captured = { value: null as string | null };
  server.use(
    http.get(`${SECURITY_ENDPOINT}/:ticker`, ({ request }) => {
      captured.value = request.headers.get('X-Price-Refresh');
      return HttpResponse.json(MOCK_SECURITIES.GOOG);
    }),
  );
  return captured;
}

describe('fetchSecurity', () => {
  it('fetches a known security', async () => {
    const result = await fetchSecurity('GOOG');
    expect(result.ticker).toBe('GOOG');
    expect(result.price).toBe(15000);
    expect(result.tags).toHaveLength(2);
  });

  it('throws ApiError for unknown ticker', async () => {
    await expect(fetchSecurity('UNKNOWN')).rejects.toThrow(
      ApiError,
    );
    await expect(fetchSecurity('UNKNOWN')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('sends no price-refresh header by default', async () => {
    const captured = captureRefreshHeader();
    await fetchSecurity('GOOG');
    expect(captured.value).toBeNull();
  });

  it('asks the backend to skip the price refresh when requested', async () => {
    const captured = captureRefreshHeader();
    await fetchSecurity('GOOG', { skipPriceRefresh: true });
    expect(captured.value).toBe('skip');
  });

  it('fetches a composite security (ETF)', async () => {
    const result = await fetchSecurity('TECH_ETF');
    expect(result.ticker).toBe('TECH_ETF');
    expect(result.compositeSecurities).toHaveLength(3);
    expect(result.compositeSecurities[0].ticker).toBe('GOOG');
  });
});

describe('fetchSecurities', () => {
  it('fetches multiple securities in parallel', async () => {
    const result = await fetchSecurities(['GOOG', 'MSFT']);
    expect(result.successes.size).toBe(2);
    expect(result.failures.size).toBe(0);
    expect(result.successes.get('GOOG')?.price).toBe(15000);
    expect(result.successes.get('MSFT')?.price).toBe(40000);
  });

  it('tolerates partial failures', async () => {
    const result = await fetchSecurities([
      'GOOG',
      'UNKNOWN',
      'MSFT',
    ]);
    expect(result.successes.size).toBe(2);
    expect(result.failures.size).toBe(1);
    expect(result.failures.has('UNKNOWN')).toBe(true);
  });

  it('handles all failures', async () => {
    const result = await fetchSecurities(['UNKNOWN', 'ALSO_BAD']);
    expect(result.successes.size).toBe(0);
    expect(result.failures.size).toBe(2);
  });

  it('handles empty input', async () => {
    const result = await fetchSecurities([]);
    expect(result.successes.size).toBe(0);
    expect(result.failures.size).toBe(0);
  });
});

/** Serves the given statuses in order (then GOOG), counting requests. */
function serveSequence(
  responses: readonly (number | 'network-error')[],
): { calls: number } {
  const counter = { calls: 0 };
  server.use(
    http.get(`${SECURITY_ENDPOINT}/:ticker`, () => {
      const next = responses[counter.calls];
      counter.calls += 1;
      if (next === 'network-error') return HttpResponse.error();
      if (next === undefined) return HttpResponse.json(MOCK_SECURITIES.GOOG);
      return HttpResponse.json(
        { error: 'ERR', message: `status ${next}` },
        { status: next },
      );
    }),
  );
  return counter;
}

const NO_DELAY = { retryDelayMs: 0 };

describe('isTransientError', () => {
  it.each([500, 502, 503, 504, 429])('treats HTTP %i as transient', (status) => {
    expect(isTransientError(new ApiError(status, 'x'))).toBe(true);
  });

  it.each([400, 401, 403, 404, 410])('treats HTTP %i as definite', (status) => {
    expect(isTransientError(new ApiError(status, 'x'))).toBe(false);
  });

  it('treats network errors and timeouts as transient', () => {
    expect(isTransientError(new TypeError('Failed to fetch'))).toBe(true);
    expect(
      isTransientError(new DOMException('timed out', 'TimeoutError')),
    ).toBe(true);
  });
});

describe('fetchSecurityWithRetry', () => {
  it.each([503, 500, 429, 'network-error'] as const)(
    'retries once after %s and returns the second response',
    async (first) => {
      const counter = serveSequence([first]);
      const result = await fetchSecurityWithRetry('GOOG', NO_DELAY);
      expect(result.ticker).toBe('GOOG');
      expect(counter.calls).toBe(2);
    },
  );

  it('gives up after exactly one retry', async () => {
    const counter = serveSequence([503, 503, 503]);
    await expect(fetchSecurityWithRetry('GOOG', NO_DELAY))
      .rejects.toMatchObject({ status: 503 });
    expect(counter.calls).toBe(2);
  });

  it.each([404, 400, 401])('does not retry HTTP %i', async (status) => {
    const counter = serveSequence([status]);
    await expect(fetchSecurityWithRetry('GOOG', NO_DELAY))
      .rejects.toMatchObject({ status });
    expect(counter.calls).toBe(1);
  });

  it('does not retry a success', async () => {
    const counter = serveSequence([]);
    await fetchSecurityWithRetry('GOOG', NO_DELAY);
    expect(counter.calls).toBe(1);
  });

  it('keeps the skip-refresh header on the retry', async () => {
    const headers: (string | null)[] = [];
    server.use(
      http.get(`${SECURITY_ENDPOINT}/:ticker`, ({ request }) => {
        headers.push(request.headers.get('X-Price-Refresh'));
        return headers.length === 1
          ? HttpResponse.json({}, { status: 503 })
          : HttpResponse.json(MOCK_SECURITIES.GOOG);
      }),
    );
    await fetchSecurityWithRetry('GOOG', { ...NO_DELAY, skipPriceRefresh: true });
    expect(headers).toEqual(['skip', 'skip']);
  });
});

describe('fetchSecurities retry', () => {
  it('retries transient failures per ticker and reports what still fails', async () => {
    const calls = new Map<string, number>();
    server.use(
      http.get(`${SECURITY_ENDPOINT}/:ticker`, ({ params }) => {
        const ticker = params.ticker as string;
        const n = (calls.get(ticker) ?? 0) + 1;
        calls.set(ticker, n);
        if (ticker === 'BLIP' && n === 1) {
          return HttpResponse.json({}, { status: 502 });
        }
        if (ticker === 'DOWN') return HttpResponse.json({}, { status: 503 });
        if (ticker === 'GONE') return HttpResponse.json({}, { status: 404 });
        return HttpResponse.json({ ...MOCK_SECURITIES.GOOG, ticker });
      }),
    );

    const result = await fetchSecurities(['BLIP', 'DOWN', 'GONE'], NO_DELAY);

    expect([...result.successes.keys()]).toEqual(['BLIP']);
    expect([...result.failures.keys()].sort()).toEqual(['DOWN', 'GONE']);
    expect(Object.fromEntries(calls)).toEqual({ BLIP: 2, DOWN: 2, GONE: 1 });
  });
});
