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
      tags: [
        {
          key: "marketCap",
          name: "Market Capitalisation",
          value: "Mega Cap",
        },
      ],
      price: 22000,
      percentage: 0.07,
      refreshedAt: "2026-03-01T10:00:00Z",
    },
    {
      ticker: "MSFT",
      tags: [
        {
          key: "marketCap",
          name: "Market Capitalisation",
          value: "Mega Cap",
        },
      ],
      price: 41000,
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
      compositeSecurities: etfDoc.compositeSecurities,
      refreshedAt: "2026-03-01T12:00:00Z",
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
