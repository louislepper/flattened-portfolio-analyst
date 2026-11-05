import { describe, it, expect } from "vitest";
import { mapSecurityDocToResponse } from "../mapper.js";
import type { SecurityDoc } from "../types.js";

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
    { key: "sector", name: "Sector", value: "Technology" },
  ],
  compositeSecurities: [],
  refreshedAt: "2026-03-01T12:00:00Z",
  updatedAt: "2026-03-01T12:30:00Z",
};

const etfDoc: SecurityDoc = {
  ticker: "SPY",
  type: "etf",
  price: 52000,
  tags: [
    { key: "index", name: "Index", value: "S&P 500" },
  ],
  compositeSecurities: [
    {
      ticker: "AAPL",
      percentage: 0.07,
      refreshedAt: "2026-03-01T10:00:00Z",
    },
    {
      ticker: "MSFT",
      percentage: 0.065,
      refreshedAt: "2026-03-01T10:00:00Z",
    },
  ],
  refreshedAt: "2026-03-01T12:00:00Z",
  updatedAt: "2026-03-01T12:30:00Z",
};

describe("mapSecurityDocToResponse", () => {
  it("maps a stock document correctly", () => {
    const result = mapSecurityDocToResponse(stockDoc);

    expect(result).toEqual({
      ticker: "GOOG",
      type: "stock",
      price: 17845,
      tags: stockDoc.tags,
      compositeSecurities: [],
      refreshedAt: "2026-03-01T12:00:00Z",
    });
  });

  it("maps an ETF document with composite securities", () => {
    const result = mapSecurityDocToResponse(etfDoc);

    expect(result).toEqual({
      ticker: "SPY",
      type: "etf",
      price: 52000,
      tags: etfDoc.tags,
      compositeSecurities: [
        {
          ticker: "AAPL",
          percentage: 0.07,
          refreshedAt: "2026-03-01T10:00:00Z",
        },
        {
          ticker: "MSFT",
          percentage: 0.065,
          refreshedAt: "2026-03-01T10:00:00Z",
        },
      ],
      refreshedAt: "2026-03-01T12:00:00Z",
    });
  });

  it("strips legacy fields from composite securities", () => {
    const docWithLegacyFields: SecurityDoc = {
      ...etfDoc,
      compositeSecurities: [
        {
          ticker: "AAPL",
          percentage: 0.07,
          refreshedAt: "2026-03-01T10:00:00Z",
        },
      ],
    };

    const result = mapSecurityDocToResponse(docWithLegacyFields);

    expect(result.compositeSecurities[0]).toEqual({
      ticker: "AAPL",
      percentage: 0.07,
      refreshedAt: "2026-03-01T10:00:00Z",
    });
    expect(
      result.compositeSecurities[0],
    ).not.toHaveProperty("tags");
    expect(
      result.compositeSecurities[0],
    ).not.toHaveProperty("price");
  });

  it("passes constituent kind through when present", () => {
    const doc: SecurityDoc = {
      ...etfDoc,
      compositeSecurities: [
        {
          ticker: "AAPL",
          isin: "US0378331005",
          percentage: 0.5,
          refreshedAt: "2026-03-01T10:00:00Z",
          kind: "equity",
        },
        {
          ticker: "T",
          isin: "US912828YK04",
          percentage: 0.3,
          refreshedAt: "2026-03-01T10:00:00Z",
          kind: "non-equity",
        },
        {
          ticker: "XS123",
          isin: null,
          percentage: 0.2,
          refreshedAt: "2026-03-01T10:00:00Z",
          kind: "unresolved",
        },
      ],
    };

    const result = mapSecurityDocToResponse(doc);

    expect(result.compositeSecurities).toEqual(doc.compositeSecurities);
  });

  it("omits kind when the doc predates it", () => {
    const result = mapSecurityDocToResponse(etfDoc);

    result.compositeSecurities.forEach((composite) => {
      expect(composite).not.toHaveProperty("kind");
    });
  });

  it("does not pass through other pipeline-only constituent fields", () => {
    const doc = {
      ...etfDoc,
      compositeSecurities: [
        {
          ticker: "005930.KS",
          rawTicker: "005930",
          isin: "KR7005930003",
          percentage: 0.1,
          refreshedAt: "2026-03-01T10:00:00Z",
          kind: "equity",
        },
      ],
    } as SecurityDoc;

    const result = mapSecurityDocToResponse(doc);

    expect(result.compositeSecurities[0]).toEqual({
      ticker: "005930.KS",
      isin: "KR7005930003",
      percentage: 0.1,
      refreshedAt: "2026-03-01T10:00:00Z",
      kind: "equity",
    });
  });

  it("strips updatedAt from the response", () => {
    const result = mapSecurityDocToResponse(stockDoc);

    expect(result).not.toHaveProperty("updatedAt");
  });

  it("preserves all tag fields", () => {
    const result = mapSecurityDocToResponse(stockDoc);

    expect(result.tags).toHaveLength(2);
    expect(result.tags[0]).toEqual({
      key: "marketCap",
      name: "Market Capitalisation",
      value: "Mega Cap",
    });
    expect(result.tags[1]).toEqual({
      key: "sector",
      name: "Sector",
      value: "Technology",
    });
  });
});
