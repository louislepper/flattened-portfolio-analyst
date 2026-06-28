import type { SecurityResponse } from '../api/types';

export interface DataFreshness {
  // Most recent price refresh across all priced securities — prices are
  // "close of" the latest available day.
  readonly priceAsOf: Date | null;
  // Oldest ETF composition date across funds held — funds report
  // quarterly, so this reflects the most stale (worst-case) staleness.
  readonly compositionAsOf: Date | null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Derives the as-of dates shown to the user, distinguishing price data
 * (each security's own refreshedAt) from ETF composition data (the
 * refreshedAt on each fund's published constituents).
 */
export function computeDataFreshness(
  securityData: ReadonlyMap<string, SecurityResponse>,
  compositeData: ReadonlyMap<string, SecurityResponse>,
): DataFreshness {
  let priceAsOf: Date | null = null;
  let compositionAsOf: Date | null = null;

  const considerPrice = (security: SecurityResponse) => {
    const refreshed = parseDate(security.refreshedAt);
    if (refreshed && (!priceAsOf || refreshed > priceAsOf)) {
      priceAsOf = refreshed;
    }
  };

  const considerComposition = (security: SecurityResponse) => {
    for (const composite of security.compositeSecurities) {
      const refreshed = parseDate(composite.refreshedAt);
      if (
        refreshed
        && (!compositionAsOf || refreshed < compositionAsOf)
      ) {
        compositionAsOf = refreshed;
      }
    }
  };

  for (const security of securityData.values()) {
    considerPrice(security);
    if (security.type === 'etf') {
      considerComposition(security);
    }
  }

  for (const security of compositeData.values()) {
    considerPrice(security);
  }

  return { priceAsOf, compositionAsOf };
}
