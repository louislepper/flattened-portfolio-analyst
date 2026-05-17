import type { SecurityDoc, SecurityResponse } from "./types.js";

export function mapSecurityDocToResponse(
  doc: SecurityDoc
): SecurityResponse {
  return {
    ticker: doc.ticker,
    isin: doc.isin,
    type: doc.type,
    price: doc.price,
    tags: doc.tags,
    compositeSecurities: doc.compositeSecurities.map(
      ({ ticker, isin, percentage, refreshedAt }) => ({
        ticker, isin, percentage, refreshedAt,
      })
    ),
    refreshedAt: doc.refreshedAt,
  };
}
