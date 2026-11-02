import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { fetchSecurity, fetchSecurities, ApiError } from './client';
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
