import type { SecurityDoc, SecurityResponse } from "./types.js";

export function mapSecurityDocToResponse(
  doc: SecurityDoc
): SecurityResponse {
  return {
    ticker: doc.ticker,
    type: doc.type,
    price: doc.price,
    tags: doc.tags,
    compositeSecurities: doc.compositeSecurities,
    refreshedAt: doc.refreshedAt,
  };
}
