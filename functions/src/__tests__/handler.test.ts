import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SecurityDoc } from "../types.js";

const mockGetSecurityDoc = vi.fn();

vi.mock("../firestore.js", () => ({
  getSecurityDoc: mockGetSecurityDoc,
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
  refreshedAt: "2026-03-01T12:00:00Z",
  updatedAt: "2026-03-01T12:30:00Z",
};

describe("handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      refreshedAt: "2026-03-01T12:00:00Z",
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
});
