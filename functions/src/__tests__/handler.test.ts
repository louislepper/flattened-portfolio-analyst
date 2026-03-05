import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SecurityDoc } from "../types.js";

const mockGetSecurityDoc = vi.fn();
const mockUpdateSecurityPrice = vi.fn();
const mockFetchQuote = vi.fn();

vi.mock("../firestore.js", () => ({
  getSecurityDoc: mockGetSecurityDoc,
  updateSecurityPrice: mockUpdateSecurityPrice,
}));

vi.mock("../finnhub.js", () => ({
  fetchQuote: mockFetchQuote,
}));

const { handler } = await import("../handler.js");

function createMockRequest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    method: "GET",
    path: "/api/v1/securities/GOOG",
    ...overrides,
  };
}

function createMockResponse(): Record<string, unknown> & {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
} {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
    set(key: string, value: string) {
      res.headers[key] = value;
      return res;
    },
  };
  return res;
}

const recentDate = new Date().toISOString();
const staleDate = new Date(
  Date.now() - 8 * 24 * 60 * 60 * 1000
).toISOString();

const stockDoc: SecurityDoc = {
  ticker: "GOOG",
  type: "stock",
  price: 17845,
  tags: [
    {
      key: "marketCap",
      name: "Market Capitalisation",
      value: "Mega Cap",
    },
  ],
  compositeSecurities: [],
  refreshedAt: recentDate,
  updatedAt: recentDate,
};

describe("handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FINNHUB_API_KEY;
  });

  it("returns 200 with correct JSON and Cache-Control header", async () => {
    mockGetSecurityDoc.mockResolvedValue(stockDoc);
    const req = createMockRequest();
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Cache-Control"]).toBe(
      "public, max-age=604800"
    );
    expect(res.body).toEqual({
      ticker: "GOOG",
      type: "stock",
      price: 17845,
      tags: stockDoc.tags,
      compositeSecurities: [],
      refreshedAt: recentDate,
    });
    expect(res.body).not.toHaveProperty("updatedAt");
  });

  it("returns 404 when Firestore returns null", async () => {
    mockGetSecurityDoc.mockResolvedValue(null);
    const req = createMockRequest({
      path: "/api/v1/securities/XYZ",
    });
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: "NOT_FOUND",
      message: "Security not found",
    });
  });

  it("returns 500 when Firestore throws", async () => {
    mockGetSecurityDoc.mockRejectedValue(
      new Error("Connection failed")
    );
    const req = createMockRequest();
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });

  it("returns 405 for non-GET methods", async () => {
    const req = createMockRequest({ method: "POST" });
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({
      error: "METHOD_NOT_ALLOWED",
      message: "Only GET requests are supported",
    });
  });

  it("returns 400 for invalid ticker format", async () => {
    const req = createMockRequest({
      path: "/api/v1/securities/invalid ticker!",
    });
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "BAD_REQUEST",
      message: "Invalid ticker format",
    });
  });

  it("uppercases the ticker before Firestore lookup", async () => {
    mockGetSecurityDoc.mockResolvedValue(stockDoc);
    const req = createMockRequest({
      path: "/api/v1/securities/goog",
    });
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(mockGetSecurityDoc).toHaveBeenCalledWith("goog");
    expect(res.statusCode).toBe(200);
  });

  it("does not call Finnhub when doc is fresh", async () => {
    process.env.FINNHUB_API_KEY = "test-key";
    mockGetSecurityDoc.mockResolvedValue(stockDoc);
    const req = createMockRequest();
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(mockFetchQuote).not.toHaveBeenCalled();
    expect(mockUpdateSecurityPrice).not.toHaveBeenCalled();
  });

  it("refreshes price from Finnhub when doc is stale", async () => {
    process.env.FINNHUB_API_KEY = "test-key";
    const staleDoc: SecurityDoc = {
      ...stockDoc,
      refreshedAt: staleDate,
      updatedAt: staleDate,
    };
    mockGetSecurityDoc.mockResolvedValue(staleDoc);
    mockFetchQuote.mockResolvedValue(19000);
    mockUpdateSecurityPrice.mockResolvedValue(undefined);
    const req = createMockRequest();
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(mockFetchQuote).toHaveBeenCalledWith(
      "GOOG",
      "test-key"
    );
    expect(mockUpdateSecurityPrice).toHaveBeenCalledWith(
      "GOOG",
      19000
    );
    const body = res.body as { price: number };
    expect(body.price).toBe(19000);
  });

  it(
    "returns stale data when Finnhub fails",
    async () => {
      process.env.FINNHUB_API_KEY = "test-key";
      const staleDoc: SecurityDoc = {
        ...stockDoc,
        refreshedAt: staleDate,
        updatedAt: staleDate,
      };
      mockGetSecurityDoc.mockResolvedValue(staleDoc);
      mockFetchQuote.mockResolvedValue(null);
      const req = createMockRequest();
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(mockUpdateSecurityPrice).not.toHaveBeenCalled();
      const body = res.body as { price: number };
      expect(body.price).toBe(17845);
    }
  );

  it(
    "sets short cache for partial ETF",
    async () => {
      const partialEtfDoc: SecurityDoc = {
        ticker: "VGS",
        type: "etf",
        price: 10000,
        tags: [],
        compositeSecurities: [
          {
            ticker: "AAPL",
            percentage: 0.3,
            refreshedAt: recentDate,
          },
          {
            ticker: "MSFT",
            percentage: 0.2,
            refreshedAt: recentDate,
          },
        ],
        refreshedAt: recentDate,
        updatedAt: recentDate,
      };
      mockGetSecurityDoc.mockResolvedValue(partialEtfDoc);
      const req = createMockRequest({
        path: "/api/v1/securities/VGS",
      });
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.headers["Cache-Control"]).toBe(
        "public, max-age=60"
      );
    }
  );

  it(
    "sets default cache for complete ETF",
    async () => {
      const completeEtfDoc: SecurityDoc = {
        ticker: "VGS",
        type: "etf",
        price: 10000,
        tags: [],
        compositeSecurities: [
          {
            ticker: "AAPL",
            percentage: 0.6,
            refreshedAt: recentDate,
          },
          {
            ticker: "MSFT",
            percentage: 0.4,
            refreshedAt: recentDate,
          },
        ],
        refreshedAt: recentDate,
        updatedAt: recentDate,
      };
      mockGetSecurityDoc.mockResolvedValue(completeEtfDoc);
      const req = createMockRequest({
        path: "/api/v1/securities/VGS",
      });
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.headers["Cache-Control"]).toBe(
        "public, max-age=604800"
      );
    }
  );
});
