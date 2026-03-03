import type { FlattenedAllocation } from './types';

const MIN_DISPLAY_PERCENTAGE = 0.0001;

export interface FilteredAllocations {
  readonly visible: readonly FlattenedAllocation[];
  readonly hiddenCount: number;
  readonly hiddenPercentage: number;
  readonly hiddenValueCents: number;
}

export function filterSmallAllocations(
  allocations: readonly FlattenedAllocation[],
): FilteredAllocations {
  const visible: FlattenedAllocation[] = [];
  let hiddenCount = 0;
  let hiddenPercentage = 0;
  let hiddenValueCents = 0;

  for (const allocation of allocations) {
    if (allocation.percentage < MIN_DISPLAY_PERCENTAGE) {
      hiddenCount += 1;
      hiddenPercentage += allocation.percentage;
      hiddenValueCents += allocation.totalValueCents;
    } else {
      visible.push(allocation);
    }
  }

  return {
    visible,
    hiddenCount,
    hiddenPercentage,
    hiddenValueCents,
  };
}
