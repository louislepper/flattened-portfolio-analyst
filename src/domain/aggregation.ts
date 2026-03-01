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
  shares: number;
  priceCents: number;
  totalValueCents: number;
  tags: readonly SecurityTag[];
  components: AllocationComponent[];
  isUnknown: boolean;
}

export function flattenPortfolio(
  holdings: readonly Holding[],
  securityDataMap: ReadonlyMap<string, SecurityResponse>,
): FlattenedAllocation[] {
  const entries = new Map<string, MutableEntry>();

  const getOrCreate = (
    ticker: string,
    priceCents: number,
    tags: readonly SecurityTag[],
    isUnknown: boolean,
  ): MutableEntry => {
    const existing = entries.get(ticker);
    if (existing) return existing;
    const entry: MutableEntry = {
      shares: 0,
      priceCents,
      totalValueCents: 0,
      tags,
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
        false,
      );
      entry.shares += holding.quantity;
      entry.totalValueCents += valueCents;
      entry.components = [
        ...entry.components,
        {
          fromTicker: holding.ticker,
          valueCents,
          effectiveShares: holding.quantity,
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
        const childEffectiveShares =
          dollarValueInChild / composite.price;
        const entry = getOrCreate(
          composite.ticker,
          composite.price,
          composite.tags,
          false,
        );
        entry.shares += childEffectiveShares;
        entry.totalValueCents += dollarValueInChild;
        entry.components = [
          ...entry.components,
          {
            fromTicker: holding.ticker,
            valueCents: dollarValueInChild,
            effectiveShares: childEffectiveShares,
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
          0,
          [],
          true,
        );
        entry.totalValueCents += unknownValueCents;
        entry.components = [
          ...entry.components,
          {
            fromTicker: holding.ticker,
            valueCents: unknownValueCents,
            effectiveShares: 0,
          },
        ];
      }
    }
  }

  const totalPortfolioValueCents = Array.from(
    entries.values(),
  ).reduce((sum, entry) => sum + entry.totalValueCents, 0);

  if (totalPortfolioValueCents === 0) return [];

  const allocations: FlattenedAllocation[] = Array.from(
    entries.entries(),
  ).map(([ticker, entry]) => ({
    ticker,
    effectiveShares: entry.shares,
    totalValueCents: entry.totalValueCents,
    percentage: entry.totalValueCents / totalPortfolioValueCents,
    tags: entry.tags,
    components: entry.components,
    isUnknown: entry.isUnknown,
  }));

  return allocations.sort((a, b) => b.percentage - a.percentage);
}
