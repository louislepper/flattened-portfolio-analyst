import type { FlattenedAllocation } from './types';
import type { TagBreakdownEntry } from './types';

export const UNTAGGED = 'Untagged';
export const UNKNOWN_LOADING = 'Unknown - loading';
export const NO_DATA = 'No data';
export const NON_EQUITY = 'Non-equity (bonds, cash, futures)';
export const UNCLASSIFIED = 'Unclassified';

function tagBucket(
  allocation: FlattenedAllocation,
  tagKey: string,
): string {
  switch (allocation.kind) {
    case 'non-equity':
      return NON_EQUITY;
    case 'unresolved':
      return UNCLASSIFIED;
    case 'unknown':
      return UNTAGGED;
    case 'security': {
      const tag = allocation.tags.find((t) => t.key === tagKey);
      if (tag) return tag.value;
      if (allocation.tagStatus === 'pending') return UNKNOWN_LOADING;
      if (allocation.tagStatus === 'failed') return NO_DATA;
      return UNTAGGED;
    }
  }
}

export function computeTagBreakdown(
  allocations: readonly FlattenedAllocation[],
  tagKey: string,
): TagBreakdownEntry[] {
  const groups = new Map<string, number>();

  for (const allocation of allocations) {
    const tagValue = tagBucket(allocation, tagKey);
    const current = groups.get(tagValue) ?? 0;
    groups.set(tagValue, current + allocation.totalValueCents);
  }

  const totalValueCents = Array.from(groups.values()).reduce(
    (sum, v) => sum + v,
    0,
  );

  if (totalValueCents === 0) return [];

  const entries: TagBreakdownEntry[] = Array.from(
    groups.entries(),
  ).map(([tagValue, valueCents]) => ({
    tagValue,
    totalValueCents: valueCents,
    percentage: valueCents / totalValueCents,
  }));

  return entries.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Share of portfolio value (0 to 1) whose tag lookups have settled. Failed
 * lookups count as settled: they will not load, so they must not hold the
 * figure below complete. Aggregate rows have nothing to load. An empty
 * portfolio is complete.
 */
export function computeTagLoadedShare(
  allocations: readonly FlattenedAllocation[],
): number {
  const total = allocations.reduce((sum, a) => sum + a.totalValueCents, 0);
  if (total <= 0) return 1;
  const pending = allocations
    .filter((a) => a.tagStatus === 'pending')
    .reduce((sum, a) => sum + a.totalValueCents, 0);
  return (total - pending) / total;
}
