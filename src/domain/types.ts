import type { SecurityTag } from '../api/types';

export interface Holding {
  readonly ticker: string;
  readonly quantity: number;
  readonly overridePrice?: number; // in cents
}

export interface AllocationComponent {
  readonly fromTicker: string;
  readonly valueCents: number;
}

export interface FlattenedAllocation {
  readonly ticker: string;
  readonly shareCount: number;
  readonly valueCentsFromComponents: number;
  readonly totalValueCents: number;
  readonly percentage: number;
  readonly price: number | null;
  readonly tags: readonly SecurityTag[];
  readonly tagsLoaded: boolean;
  readonly components: readonly AllocationComponent[];
  readonly isUnknown: boolean;
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
