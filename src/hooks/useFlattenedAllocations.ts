import { useMemo } from 'react';
import { flattenPortfolio } from '../domain/aggregation';
import { usePortfolio } from './usePortfolio';
import type { FlattenedAllocation } from '../domain/types';

export function useFlattenedAllocations(): FlattenedAllocation[] {
  const { state } = usePortfolio();

  const failedLookups = useMemo(
    () => new Set([
      ...state.failedTickers,
      ...state.failedConstituentTickers,
    ]),
    [state.failedTickers, state.failedConstituentTickers],
  );

  return useMemo(
    () => flattenPortfolio(
      state.holdings,
      state.securityData,
      state.compositeSecurityData,
      failedLookups,
    ),
    [
      state.holdings,
      state.securityData,
      state.compositeSecurityData,
      failedLookups,
    ],
  );
}
