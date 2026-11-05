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

/**
 * What a row in the flattened portfolio represents:
 * - `security`: a real per-ticker security (a direct holding or an equity
 *   constituent of a fund);
 * - `unknown`: the share of a fund whose constituents were not published;
 * - `non-equity`: a fund's bonds, cash, futures and similar, one row per fund;
 * - `unresolved`: a fund's constituents the pipeline could not identify, one
 *   row per fund.
 * Only `security` rows are companies; the others are per-fund aggregates that
 * never merge with a real ticker.
 */
export type AllocationKind =
  | 'security'
  | 'unknown'
  | 'non-equity'
  | 'unresolved';

/**
 * Whether a row's tags have arrived. `failed` means the lookup gave up (it
 * will not be retried again in this session); aggregate rows are `loaded`
 * because they have nothing to load.
 */
export type TagLoadStatus = 'loaded' | 'pending' | 'failed';

export interface FlattenedAllocation {
  readonly ticker: string;
  readonly kind: AllocationKind;
  readonly shareCount: number;
  readonly valueCentsFromComponents: number;
  readonly totalValueCents: number;
  readonly percentage: number;
  readonly price: number | null;
  readonly tags: readonly SecurityTag[];
  readonly tagStatus: TagLoadStatus;
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

/**
 * Progress of the background constituent tag lookups that start once the
 * user's holdings have loaded. `idle` before any analysis.
 */
export type ConstituentLoadStatus = 'idle' | 'loading' | 'complete';

export type PortfolioPhase =
  | 'input'
  | 'loading'
  | 'results'
  | 'error';
