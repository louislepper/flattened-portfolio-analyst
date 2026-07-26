const BASE_URL = "https://finnhub.io/api/v1/quote";

// Without this, a hung upstream connection holds the function instance open
// until the platform timeout. A refresh is best-effort — the caller falls back
// to the cached price — so give up quickly rather than burning the request.
const REQUEST_TIMEOUT_MS = 3000;

export async function fetchQuote(
  ticker: string,
  apiKey: string
): Promise<number | null> {
  try {
    const url =
      `${BASE_URL}?symbol=${encodeURIComponent(ticker)}` +
      `&token=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { c: number };
    if (!data.c) {
      return null;
    }

    return Math.round(data.c * 100);
  } catch {
    return null;
  }
}
