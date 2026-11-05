import type {
  CompositeSecurity,
  ConstituentKind,
  SecurityResponse,
} from '../api/types';

// Tickers the securities API can serve. Anything else (ISIN-like strings with
// spaces, "CASH USD", "-") is not a ticker the pipeline could have written.
export const VALID_TICKER_PATTERN = /^[A-Z0-9._-]+$/;

// Placeholder some providers publish for holdings they do not identify.
const UNKNOWN_PLACEHOLDER = 'UNKNOWN';

/**
 * The constituent's kind, defaulting docs written before the pipeline recorded
 * it: a missing kind is `equity` (legacy behaviour), except for a ticker that
 * could not be a real security, which is `unresolved`.
 */
export function resolveConstituentKind(
  composite: CompositeSecurity,
): ConstituentKind {
  if (composite.kind !== undefined) return composite.kind;
  const ticker = composite.ticker.toUpperCase();
  const looksLikeTicker =
    VALID_TICKER_PATTERN.test(ticker) && ticker !== UNKNOWN_PLACEHOLDER;
  return looksLikeTicker ? 'equity' : 'unresolved';
}

/**
 * Equity constituent tickers of the given ETFs that still need a lookup for
 * their tags, in first-seen order. Tickers already present in `securityData`
 * (the user's own holdings) are skipped.
 */
export function collectConstituentLookups(
  securityData: ReadonlyMap<string, SecurityResponse>,
): string[] {
  const tickers = Array.from(securityData.values())
    .filter((security) => security.type === 'etf')
    .flatMap((security) => security.compositeSecurities)
    .filter((composite) => resolveConstituentKind(composite) === 'equity')
    .map((composite) => composite.ticker)
    .filter((ticker) => !securityData.has(ticker));
  return Array.from(new Set(tickers));
}
