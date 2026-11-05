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

// One retry absorbs a blip (a dropped connection, a cold-start 503, a burst
// that tripped rate limiting) without doubling the load of a real outage.
const TRANSIENT_RETRY_ATTEMPTS = 1;
const TRANSIENT_RETRY_DELAY_MS = 500;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;

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

/**
 * Whether a lookup failure is worth retrying: network errors and timeouts
 * (anything that is not an HTTP response), 5xx and 429. A 404 or other 4xx is
 * a definite answer and is not retried.
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status === HTTP_TOO_MANY_REQUESTS
    || error.status >= HTTP_SERVER_ERROR_MIN;
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  readonly retryDelayMs?: number;
}

/** {@link fetchSecurity}, retried once after a transient failure. */
export async function fetchSecurityWithRetry(
  ticker: string,
  options: FetchSecurityOptions & RetryOptions = {},
): Promise<SecurityResponse> {
  const attempt = async (retriesLeft: number): Promise<SecurityResponse> => {
    try {
      return await fetchSecurity(ticker, options);
    } catch (error) {
      if (retriesLeft <= 0 || !isTransientError(error)) throw error;
      await delay(options.retryDelayMs ?? TRANSIENT_RETRY_DELAY_MS);
      return attempt(retriesLeft - 1);
    }
  };
  return attempt(TRANSIENT_RETRY_ATTEMPTS);
}

export interface FetchSecuritiesResult {
  readonly successes: ReadonlyMap<string, SecurityResponse>;
  readonly failures: ReadonlyMap<string, Error>;
}

export async function fetchSecurities(
  tickers: readonly string[],
  options: FetchSecurityOptions & RetryOptions = {},
): Promise<FetchSecuritiesResult> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => ({
      ticker,
      data: await fetchSecurityWithRetry(ticker, options),
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
