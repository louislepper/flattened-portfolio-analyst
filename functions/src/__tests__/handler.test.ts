import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SecurityDoc } from "../types.js";

const mockGetSecurityDoc = vi.fn();
const mockUpdateSecurityPrice = vi.fn();
const mockFetchQuote = vi.fn();
const mockVerifyToken = vi.fn();
const mockGetAppCheckMode = vi.fn();

vi.mock("../firestore.js", () => ({
  getSecurityDoc: mockGetSecurityDoc,
  updateSecurityPrice: mockUpdateSecurityPrice,
}));

vi.mock("../finnhub.js", () => ({
  fetchQuote: mockFetchQuote,
}));

vi.mock("firebase-admin/app-check", () => ({
  getAppCheck: () => ({ verifyToken: mockVerifyToken }),
}));

vi.mock("../launchdarkly.js", () => ({
  getAppCheckMode: mockGetAppCheckMode,
}));

const { handler, isStale } = await import("../handler.js");

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString();

function createMockRequest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const headers = (overrides.headers as Record<string, string>) ?? {};
  return {
    method: "GET",
    path: "/api/v1/securities/GOOG",
    header: (name: string) => headers[name.toLowerCase()],
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
// Past the always-refresh threshold, so handler tests stay deterministic —
// ages inside the ramp window refresh only probabilistically. The ramp itself
// is covered by the isStale unit tests below.
const staleDate = new Date(
  Date.now() - 30 * 24 * 60 * 60 * 1000
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
    // App Check off by default so non-App-Check tests are unaffected.
    mockGetAppCheckMode.mockResolvedValue("off");
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
    expect(res.headers["Cache-Control"]).toBe(
      "public, max-age=345600"
    );
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
    expect(res.headers["Cache-Control"]).toBe("no-store");
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
    expect(res.headers["Cache-Control"]).toBe(
      "public, max-age=259200"
    );
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
    expect(res.headers["Cache-Control"]).toBe(
      "public, max-age=259200"
    );
    expect(res.body).toEqual({
      error: "BAD_REQUEST",
      message: "Invalid ticker format",
    });
  });

  it("returns 400 and skips Firestore for requests with query params", async () => {
    const req = createMockRequest({ query: { x: "1" } });
    const res = createMockResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.headers["Cache-Control"]).toBe(
      "public, max-age=259200"
    );
    expect(res.body).toEqual({
      error: "BAD_REQUEST",
      message: "Query parameters are not supported",
    });
    expect(mockGetSecurityDoc).not.toHaveBeenCalled();
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
        "public, max-age=259200"
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

  describe("App Check (LaunchDarkly-gated)", () => {
    it("does not verify or reject in 'off' mode", async () => {
      mockGetAppCheckMode.mockResolvedValue("off");
      mockGetSecurityDoc.mockResolvedValue(stockDoc);
      const req = createMockRequest();
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it("returns 401 and skips Firestore when token is missing (enforce)", async () => {
      mockGetAppCheckMode.mockResolvedValue("enforce");
      const req = createMockRequest();
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(401);
      expect(res.headers["Cache-Control"]).toBe("no-store");
      expect(res.body).toEqual({
        error: "UNAUTHORIZED",
        message: "Missing or invalid App Check token",
      });
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockGetSecurityDoc).not.toHaveBeenCalled();
    });

    it("returns 401 and skips Firestore when token is invalid (enforce)", async () => {
      mockGetAppCheckMode.mockResolvedValue("enforce");
      mockVerifyToken.mockRejectedValue(new Error("invalid token"));
      const req = createMockRequest({
        headers: { "x-firebase-appcheck": "bad-token" },
      });
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(401);
      expect(res.headers["Cache-Control"]).toBe("no-store");
      expect(mockVerifyToken).toHaveBeenCalledWith("bad-token");
      expect(mockGetSecurityDoc).not.toHaveBeenCalled();
    });

    it("serves the security when token is valid (enforce)", async () => {
      mockGetAppCheckMode.mockResolvedValue("enforce");
      mockVerifyToken.mockResolvedValue({ appId: "test-app" });
      mockGetSecurityDoc.mockResolvedValue(stockDoc);
      const req = createMockRequest({
        headers: { "x-firebase-appcheck": "good-token" },
      });
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(mockVerifyToken).toHaveBeenCalledWith("good-token");
      expect(res.statusCode).toBe(200);
      expect(res.headers["Cache-Control"]).toBe(
        "public, max-age=604800"
      );
    });

    it("verifies but does not reject an invalid token in 'monitor' mode", async () => {
      mockGetAppCheckMode.mockResolvedValue("monitor");
      mockVerifyToken.mockRejectedValue(new Error("invalid token"));
      mockGetSecurityDoc.mockResolvedValue(stockDoc);
      const req = createMockRequest({
        headers: { "x-firebase-appcheck": "bad-token" },
      });
      const res = createMockResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler(req as any, res as any);

      expect(mockVerifyToken).toHaveBeenCalledWith("bad-token");
      // Not rejected: the request proceeds to Firestore and returns 200.
      expect(mockGetSecurityDoc).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });
});

describe("isStale", () => {
  const alwaysRefresh = () => 0;
  const neverRefresh = () => 0.999999;

  it("is fresh below the minimum age regardless of chance", () => {
    expect(isStale(daysAgo(1), alwaysRefresh)).toBe(false);
    expect(isStale(daysAgo(6.9), alwaysRefresh)).toBe(false);
  });

  it("is stale above the maximum age regardless of chance", () => {
    expect(isStale(daysAgo(28.1), neverRefresh)).toBe(true);
    expect(isStale(daysAgo(365), neverRefresh)).toBe(true);
  });

  it("ramps linearly across the window", () => {
    // Midpoint of the 7..28 day window is 17.5 days -> ~50% chance.
    expect(isStale(daysAgo(17.5), () => 0.49)).toBe(true);
    expect(isStale(daysAgo(17.5), () => 0.51)).toBe(false);
  });

  it("is unlikely to refresh just past the minimum age", () => {
    // ~4.8% of the way into the window.
    expect(isStale(daysAgo(8), () => 0.2)).toBe(false);
    expect(isStale(daysAgo(8), () => 0.01)).toBe(true);
  });

  it("is likely to refresh just below the maximum age", () => {
    // ~95% of the way into the window.
    expect(isStale(daysAgo(27), () => 0.9)).toBe(true);
    expect(isStale(daysAgo(27), () => 0.99)).toBe(false);
  });

  it("treats a missing timestamp as stale", () => {
    expect(isStale(undefined, neverRefresh)).toBe(true);
  });

  it("treats a malformed timestamp as stale", () => {
    expect(isStale("", neverRefresh)).toBe(true);
    expect(isStale("not-a-date", neverRefresh)).toBe(true);
  });

  it("treats a future timestamp as fresh", () => {
    const future = new Date(Date.now() + DAY_MS).toISOString();
    expect(isStale(future, alwaysRefresh)).toBe(false);
  });

  it("defaults to Math.random when no source is given", () => {
    expect(isStale(daysAgo(1))).toBe(false);
    expect(isStale(daysAgo(365))).toBe(true);
  });
});
