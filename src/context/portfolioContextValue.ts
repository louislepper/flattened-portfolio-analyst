import { createContext } from 'react';
import type { SecurityResponse } from '../api/types';
import type {
  ConstituentLoadStatus,
  Holding,
  PortfolioPhase,
  ViewMode,
} from '../domain/types';

export interface PortfolioState {
  readonly holdings: readonly Holding[];
  readonly securityData: ReadonlyMap<string, SecurityResponse>;
  readonly compositeSecurityData: ReadonlyMap<
    string,
    SecurityResponse
  >;
  readonly phase: PortfolioPhase;
  readonly errorMessage: string | null;
  /** User holdings whose lookup failed or returned no price. */
  readonly failedTickers: readonly string[];
  /** Background lookups of ETF constituents' tags. */
  readonly constituentLoadStatus: ConstituentLoadStatus;
  /** Equity constituents queued for lookup in the current analysis. */
  readonly constituentLookupCount: number;
  /** Constituents whose lookup failed, after any retry. */
  readonly failedConstituentTickers: ReadonlySet<string>;
  readonly viewMode: ViewMode;
}

export interface PortfolioContextValue {
  readonly state: PortfolioState;
  readonly addHolding: (ticker: string, quantity: number) => void;
  readonly addHoldings: (holdings: readonly Holding[]) => void;
  readonly removeHolding: (ticker: string) => void;
  readonly clearHoldings: () => void;
  readonly analyzePortfolio: () => Promise<void>;
  readonly setViewMode: (viewMode: ViewMode) => void;
  readonly reset: () => void;
}

export const PortfolioContext =
  createContext<PortfolioContextValue | null>(null);
