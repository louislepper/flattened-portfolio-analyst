import type { SecurityTag } from '../api/types';

export interface Holding {
  readonly ticker: string;
  readonly quantity: number;
}

export interface AllocationComponent {
  readonly fromTicker: string;
  readonly valueCents: number;
  readonly effectiveShares: number;
}

export interface FlattenedAllocation {
  readonly ticker: string;
  readonly effectiveShares: number;
  readonly totalValueCents: number;
  readonly percentage: number;
  readonly tags: readonly SecurityTag[];
  readonly components: readonly AllocationComponent[];
}

export interface TagBreakdownEntry {
  readonly tagValue: string;
  readonly totalValueCents: number;
  readonly percentage: number;
}

export type ViewMode =
  | { readonly kind: 'securities' }
  | { readonly kind: 'tag'; readonly tagKey: string; readonly tagName: string };

export type PortfolioPhase =
  | 'input'
  | 'loading'
  | 'results'
  | 'error';
