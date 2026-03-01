import { SECURITY_ENDPOINT } from './endpoints';
import type { SecurityResponse } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchSecurity(
  ticker: string,
): Promise<SecurityResponse> {
  const response = await fetch(
    `${SECURITY_ENDPOINT}/${encodeURIComponent(ticker)}`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.message ?? `Failed to fetch security: ${response.status}`,
    );
  }

  return response.json();
}

export interface FetchSecuritiesResult {
  readonly successes: ReadonlyMap<string, SecurityResponse>;
  readonly failures: ReadonlyMap<string, Error>;
}

export async function fetchSecurities(
  tickers: readonly string[],
): Promise<FetchSecuritiesResult> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => ({
      ticker,
      data: await fetchSecurity(ticker),
    })),
  );

  const successes = new Map<string, SecurityResponse>();
  const failures = new Map<string, Error>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successes.set(result.value.ticker, result.value.data);
    } else {
      const error = result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));
      const ticker = tickers[results.indexOf(result)];
      failures.set(ticker, error);
    }
  }

  return { successes, failures };
}
