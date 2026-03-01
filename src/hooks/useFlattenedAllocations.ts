import { useMemo } from 'react';
import { flattenPortfolio } from '../domain/aggregation';
import { usePortfolio } from './usePortfolio';
import type { FlattenedAllocation } from '../domain/types';

export function useFlattenedAllocations(): FlattenedAllocation[] {
  const { state } = usePortfolio();

  return useMemo(
    () => flattenPortfolio(state.holdings, state.securityData),
    [state.holdings, state.securityData],
  );
}
