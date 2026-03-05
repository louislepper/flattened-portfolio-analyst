import type { SecurityResponse, SecurityTag } from '../api/types';
import type {
  Holding,
  FlattenedAllocation,
  AllocationComponent,
} from './types';

const UNKNOWN_TICKER_PREFIX = 'Unknown (From ';

export function formatUnknownTicker(etfTicker: string): string {
  return `${UNKNOWN_TICKER_PREFIX}${etfTicker})`;
}

interface MutableEntry {
  shareCount: number;
  valueCentsFromComponents: number;
  price: number | null;
  tags: readonly SecurityTag[];
  tagsLoaded: boolean;
  components: AllocationComponent[];
  isUnknown: boolean;
}

export function flattenPortfolio(
  holdings: readonly Holding[],
  securityDataMap: ReadonlyMap<string, SecurityResponse>,
  compositeDataMap?: ReadonlyMap<string, SecurityResponse>,
): FlattenedAllocation[] {
  const entries = new Map<string, MutableEntry>();

  const getOrCreate = (
    ticker: string,
    price: number | null,
    tags: readonly SecurityTag[],
    tagsLoaded: boolean,
    isUnknown: boolean,
  ): MutableEntry => {
    const existing = entries.get(ticker);
    if (existing) {
      if (price !== null && existing.price === null) {
        existing.price = price;
      }
      if (tagsLoaded && !existing.tagsLoaded) {
        existing.tags = tags;
        existing.tagsLoaded = true;
      }
      return existing;
    }
    const entry: MutableEntry = {
      shareCount: 0,
      valueCentsFromComponents: 0,
      price,
      tags,
      tagsLoaded,
      components: [],
      isUnknown,
    };
    entries.set(ticker, entry);
    return entry;
  };

  for (const holding of holdings) {
    const security = securityDataMap.get(holding.ticker);
    if (!security) continue;

    const isEtf = security.type === 'etf';

    if (!isEtf) {
      const valueCents = holding.quantity * security.price;
      const entry = getOrCreate(
        holding.ticker,
        security.price,
        security.tags,
        true,
        false,
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
      for (const composite of security.compositeSecurities) {
        knownPercentage += composite.percentage;
        const dollarValueInChild =
          etfTotalValueCents * composite.percentage;

        const compositeData =
          compositeDataMap?.get(composite.ticker)
          ?? securityDataMap.get(composite.ticker);

        const childPrice = compositeData?.price ?? null;
        const childTags = compositeData?.tags ?? [];
        const childTagsLoaded = compositeData !== undefined;

        const entry = getOrCreate(
          composite.ticker,
          childPrice,
          childTags,
          childTagsLoaded,
          false,
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

      const unknownPercentage = 1 - knownPercentage;
      if (unknownPercentage > 1e-9) {
        const unknownValueCents =
          etfTotalValueCents * unknownPercentage;
        const unknownTicker =
          formatUnknownTicker(holding.ticker);
        const entry = getOrCreate(
          unknownTicker,
          null,
          [],
          true,
          true,
        );
        entry.valueCentsFromComponents += unknownValueCents;
        entry.components = [
          ...entry.components,
          {
            fromTicker: holding.ticker,
            valueCents: unknownValueCents,
          },
        ];
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
      shareCount: entry.shareCount,
      valueCentsFromComponents: entry.valueCentsFromComponents,
      totalValueCents,
      percentage:
        totalValueCents / totalPortfolioValueCents,
      price: entry.price,
      tags: entry.tags,
      tagsLoaded: entry.tagsLoaded,
      components: entry.components,
      isUnknown: entry.isUnknown,
    };
  });

  return allocations.sort(
    (a, b) => b.percentage - a.percentage,
  );
}
