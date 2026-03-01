import { useMemo } from 'react';
import { computeTagBreakdown } from '../domain/tag-analysis';
import type {
  FlattenedAllocation,
  TagBreakdownEntry,
} from '../domain/types';

export function useTagBreakdown(
  allocations: readonly FlattenedAllocation[],
  tagKey: string | null,
): TagBreakdownEntry[] {
  return useMemo(() => {
    if (!tagKey) return [];
    return computeTagBreakdown(allocations, tagKey);
  }, [allocations, tagKey]);
}
