import type { SecurityResponse, SecurityTag } from '../api/types';
import type {
  Holding,
  FlattenedAllocation,
  AllocationComponent,
  AllocationKind,
  TagLoadStatus,
} from './types';
import { resolveConstituentKind } from './constituents';

const UNKNOWN_TICKER_PREFIX = 'Unknown (From ';
const NON_EQUITY_TICKER_PREFIX = 'Non-equity holdings (from ';
const UNRESOLVED_TICKER_PREFIX = 'Unclassified holdings (from ';
const NO_FAILED_LOOKUPS: ReadonlySet<string> = new Set();

export function formatUnknownTicker(etfTicker: string): string {
  return `${UNKNOWN_TICKER_PREFIX}${etfTicker})`;
}

export function formatNonEquityTicker(etfTicker: string): string {
  return `${NON_EQUITY_TICKER_PREFIX}${etfTicker})`;
}

export function formatUnresolvedTicker(etfTicker: string): string {
  return `${UNRESOLVED_TICKER_PREFIX}${etfTicker})`;
}

/** Real per-ticker securities, as opposed to per-fund aggregate rows. */
export function isSecurityRow(allocation: FlattenedAllocation): boolean {
  return allocation.kind === 'security';
}

/**
 * Number of distinct companies: security rows, excluding per-fund aggregates
 * and constituents whose lookup failed (no doc, so not a known company).
 */
export function countCompanies(
  allocations: readonly FlattenedAllocation[],
): number {
  return allocations.filter(
    (a) => isSecurityRow(a) && a.tagStatus !== 'failed',
  ).length;
}

// Settled beats pending, and a successful lookup beats a failed one, so a
// ticker that is both a direct holding and a constituent shows its best data.
const TAG_STATUS_RANK: Readonly<Record<TagLoadStatus, number>> = {
  pending: 0,
  failed: 1,
  loaded: 2,
};

interface MutableEntry {
  readonly kind: AllocationKind;
  shareCount: number;
  valueCentsFromComponents: number;
  price: number | null;
  tags: readonly SecurityTag[];
  tagStatus: TagLoadStatus;
  components: AllocationComponent[];
}

/**
 * Flattens the user's holdings into per-security exposure.
 *
 * `failedLookups` holds tickers whose lookup has given up (user holdings and
 * ETF constituents): their rows get tag status `failed` rather than `pending`.
 * A user holding with no security data (failed lookup, no CSV price) has no
 * value and is left out of the total entirely.
 */
export function flattenPortfolio(
  holdings: readonly Holding[],
  securityDataMap: ReadonlyMap<string, SecurityResponse>,
  compositeDataMap?: ReadonlyMap<string, SecurityResponse>,
  failedLookups: ReadonlySet<string> = NO_FAILED_LOOKUPS,
): FlattenedAllocation[] {
  const entries = new Map<string, MutableEntry>();

  const getOrCreate = (
    ticker: string,
    kind: AllocationKind,
    price: number | null,
    tags: readonly SecurityTag[],
    tagStatus: TagLoadStatus,
  ): MutableEntry => {
    const existing = entries.get(ticker);
    if (existing) {
      if (price !== null && existing.price === null) {
        existing.price = price;
      }
      if (TAG_STATUS_RANK[tagStatus] > TAG_STATUS_RANK[existing.tagStatus]) {
        existing.tags = tags;
        existing.tagStatus = tagStatus;
      }
      return existing;
    }
    const entry: MutableEntry = {
      kind,
      shareCount: 0,
      valueCentsFromComponents: 0,
      price,
      tags,
      tagStatus,
      components: [],
    };
    entries.set(ticker, entry);
    return entry;
  };

  const addFundAggregate = (
    ticker: string,
    kind: AllocationKind,
    etfTicker: string,
    valueCents: number,
  ) => {
    const entry = getOrCreate(ticker, kind, null, [], 'loaded');
    entry.valueCentsFromComponents += valueCents;
    entry.components = [
      ...entry.components,
      { fromTicker: etfTicker, valueCents },
    ];
  };

  for (const holding of holdings) {
    const security = securityDataMap.get(holding.ticker);
    if (!security) continue;

    const isEtf = security.type === 'etf';

    if (!isEtf) {
      const valueCents = holding.quantity * security.price;
      const entry = getOrCreate(
        holding.ticker,
        'security',
        security.price,
        security.tags,
        failedLookups.has(holding.ticker) ? 'failed' : 'loaded',
      );
      entry.shareCount += holding.quantity;
      entry.components = [
        ...entry.components,
        {
          fromTicker: holding.ticker,
          valueCents,
        },
      ];
    } else {
      const etfTotalValueCents =
        holding.quantity * security.price;

      let knownPercentage = 0;
      let nonEquityValueCents = 0;
      let unresolvedValueCents = 0;
      for (const composite of security.compositeSecurities) {
        knownPercentage += composite.percentage;
        const dollarValueInChild =
          etfTotalValueCents * composite.percentage;

        // Non-equity and unresolved constituents carry the provider's raw
        // string as their ticker, which can collide with a real security
        // (Treasuries as "T" would merge into AT&T), so they are kept apart
        // in one row per fund instead of keyed by ticker.
        const constituentKind = resolveConstituentKind(composite);
        if (constituentKind === 'non-equity') {
          nonEquityValueCents += dollarValueInChild;
          continue;
        }
        if (constituentKind === 'unresolved') {
          unresolvedValueCents += dollarValueInChild;
          continue;
        }

        const compositeData =
          compositeDataMap?.get(composite.ticker)
          ?? securityDataMap.get(composite.ticker);

        // Constituents are fetched without a price refresh, so a never-priced
        // doc arrives as 0; treat that as "unknown" rather than a real price.
        const rawChildPrice = compositeData?.price ?? null;
        const childPrice = rawChildPrice ? rawChildPrice : null;
        const childTags = compositeData?.tags ?? [];
        const childTagStatus: TagLoadStatus = compositeData !== undefined
          ? 'loaded'
          : failedLookups.has(composite.ticker) ? 'failed' : 'pending';

        const entry = getOrCreate(
          composite.ticker,
          'security',
          childPrice,
          childTags,
          childTagStatus,
        );
        entry.valueCentsFromComponents += dollarValueInChild;
        entry.components = [
          ...entry.components,
          {
            fromTicker: holding.ticker,
            valueCents: dollarValueInChild,
          },
        ];
      }

      if (nonEquityValueCents > 0) {
        addFundAggregate(
          formatNonEquityTicker(holding.ticker),
          'non-equity',
          holding.ticker,
          nonEquityValueCents,
        );
      }
      if (unresolvedValueCents > 0) {
        addFundAggregate(
          formatUnresolvedTicker(holding.ticker),
          'unresolved',
          holding.ticker,
          unresolvedValueCents,
        );
      }

      const unknownPercentage = 1 - knownPercentage;
      if (unknownPercentage > 1e-9) {
        addFundAggregate(
          formatUnknownTicker(holding.ticker),
          'unknown',
          holding.ticker,
          etfTotalValueCents * unknownPercentage,
        );
      }
    }
  }

  const totalPortfolioValueCents = Array.from(
    entries.values(),
  ).reduce((sum, entry) => {
    const directValue =
      entry.shareCount * (entry.price ?? 0);
    return sum + entry.valueCentsFromComponents + directValue;
  }, 0);

  if (totalPortfolioValueCents === 0) return [];

  const allocations: FlattenedAllocation[] = Array.from(
    entries.entries(),
  ).map(([ticker, entry]) => {
    const totalValueCents =
      entry.valueCentsFromComponents
      + entry.shareCount * (entry.price ?? 0);
    return {
      ticker,
      kind: entry.kind,
      shareCount: entry.shareCount,
      valueCentsFromComponents: entry.valueCentsFromComponents,
      totalValueCents,
      percentage:
        totalValueCents / totalPortfolioValueCents,
      price: entry.price,
      tags: entry.tags,
      tagStatus: entry.tagStatus,
      components: entry.components,
    };
  });

  return allocations.sort(
    (a, b) => b.percentage - a.percentage,
  );
}
