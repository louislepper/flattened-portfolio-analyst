const BASE_URL = "https://finnhub.io/api/v1/quote";

export async function fetchQuote(
  ticker: string,
  apiKey: string
): Promise<number | null> {
  try {
    const url =
      `${BASE_URL}?symbol=${encodeURIComponent(ticker)}` +
      `&token=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);

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
