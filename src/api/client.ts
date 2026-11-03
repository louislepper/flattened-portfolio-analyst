import { SECURITY_ENDPOINT } from './endpoints';
import { getAppCheckToken } from './appCheck';
import type { SecurityResponse } from './types';

const APP_CHECK_HEADER = 'X-Firebase-AppCheck';
// Tells the backend not to spend a Finnhub call refreshing this security's
// price. Used for ETF constituents: their value comes from the ETF's own
// price, so the rate-limited Finnhub budget is kept for the user's holdings.
const PRICE_REFRESH_HEADER = 'X-Price-Refresh';
const PRICE_REFRESH_SKIP = 'skip';

// Comfortably longer than the backend's own upstream timeout, so a slow
// refresh surfaces as a backend response rather than a client-side abort.
// Without it a hung request leaves the UI spinning with no way out.
const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface FetchSecurityOptions {
  /** Skip the backend's lazy price refresh (for ETF constituents). */
  readonly skipPriceRefresh?: boolean;
}

export async function fetchSecurity(
  ticker: string,
  options: FetchSecurityOptions = {},
): Promise<SecurityResponse> {
  const token = await getAppCheckToken();
  const headers: Record<string, string> = {
    ...(token ? { [APP_CHECK_HEADER]: token } : {}),
    ...(options.skipPriceRefresh
      ? { [PRICE_REFRESH_HEADER]: PRICE_REFRESH_SKIP }
      : {}),
  };

  const response = await fetch(
    `${SECURITY_ENDPOINT}/${encodeURIComponent(ticker)}`,
    { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
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

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successes.set(result.value.ticker, result.value.data);
    } else {
      const error = result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));
      failures.set(tickers[index], error);
    }
  });

  return { successes, failures };
}
