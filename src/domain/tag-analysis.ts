import type { FlattenedAllocation } from './types';
import type { TagBreakdownEntry } from './types';

const UNTAGGED = 'Untagged';

export function computeTagBreakdown(
  allocations: readonly FlattenedAllocation[],
  tagKey: string,
): TagBreakdownEntry[] {
  const groups = new Map<string, number>();

  for (const allocation of allocations) {
    const tag = allocation.tags.find((t) => t.key === tagKey);
    const tagValue = tag?.value ?? UNTAGGED;
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
