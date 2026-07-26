import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchQuote } from "../finnhub.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fetchQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns price in cents on successful quote", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ c: 178.45 }),
    });

    const result = await fetchQuote("GOOG", "test-key");

    expect(result).toBe(17845);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://finnhub.io/api/v1/quote" +
        "?symbol=GOOG&token=test-key",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("returns null when the request times out", async () => {
    mockFetch.mockRejectedValue(
      new DOMException("The operation was aborted", "TimeoutError")
    );

    const result = await fetchQuote("GOOG", "test-key");

    expect(result).toBeNull();
  });

  it("returns null on API error response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await fetchQuote("GOOG", "bad-key");

    expect(result).toBeNull();
  });

  it("returns null when price is zero", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ c: 0 }),
    });

    const result = await fetchQuote("INVALID", "test-key");

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await fetchQuote("GOOG", "test-key");

    expect(result).toBeNull();
  });
});
