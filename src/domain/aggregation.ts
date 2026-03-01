import type { SecurityResponse, SecurityTag } from '../api/types';
import type {
  Holding,
  FlattenedAllocation,
  AllocationComponent,
} from './types';

interface MutableEntry {
  shares: number;
  priceCents: number;
  tags: readonly SecurityTag[];
  components: AllocationComponent[];
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
  ): MutableEntry => {
    const existing = entries.get(ticker);
    if (existing) return existing;
    const entry: MutableEntry = {
      shares: 0,
      priceCents,
      tags,
      components: [],
    };
    entries.set(ticker, entry);
    return entry;
  };

  for (const holding of holdings) {
    const security = securityDataMap.get(holding.ticker);
    if (!security) continue;

    if (security.compositeSecurities.length === 0) {
      const valueCents = holding.quantity * security.price;
      const entry = getOrCreate(
        holding.ticker,
        security.price,
        security.tags,
      );
      entry.shares += holding.quantity;
      entry.components = [
        ...entry.components,
        {
          fromTicker: holding.ticker,
          valueCents,
          effectiveShares: holding.quantity,
        },
      ];
    } else {
      const etfTotalValueCents = holding.quantity * security.price;
      for (const composite of security.compositeSecurities) {
        const dollarValueInChild =
          etfTotalValueCents * composite.percentage;
        const childEffectiveShares =
          dollarValueInChild / composite.price;
        const entry = getOrCreate(
          composite.ticker,
          composite.price,
          composite.tags,
        );
        entry.shares += childEffectiveShares;
        entry.components = [
          ...entry.components,
          {
            fromTicker: holding.ticker,
            valueCents: dollarValueInChild,
            effectiveShares: childEffectiveShares,
          },
        ];
      }
    }
  }

  const totalPortfolioValueCents = Array.from(entries.values())
    .reduce(
      (sum, entry) => sum + entry.shares * entry.priceCents,
      0,
    );

  if (totalPortfolioValueCents === 0) return [];

  const allocations: FlattenedAllocation[] = Array.from(
    entries.entries(),
  ).map(([ticker, entry]) => ({
    ticker,
    effectiveShares: entry.shares,
    totalValueCents: entry.shares * entry.priceCents,
    percentage:
      (entry.shares * entry.priceCents) / totalPortfolioValueCents,
    tags: entry.tags,
    components: entry.components,
  }));

  return allocations.sort((a, b) => b.percentage - a.percentage);
}
