import { describe, it, expect } from 'vitest';
import { fetchSecurity, fetchSecurities, ApiError } from './client';

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
