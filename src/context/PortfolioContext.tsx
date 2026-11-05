import {
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { SecurityResponse } from '../api/types';
import type { Holding, ViewMode } from '../domain/types';
import { fetchSecurities } from '../api/client';
import { collectConstituentLookups } from '../domain/constituents';
import {
  PortfolioContext,
  type PortfolioState,
} from './portfolioContextValue';

const COMPOSITE_BATCH_SIZE = 20;
const UNPRICED_MESSAGE = 'No price is available for this security yet';

type PortfolioAction =
  | { type: 'ADD_HOLDING'; holding: Holding }
  | { type: 'ADD_HOLDINGS'; holdings: readonly Holding[] }
  | { type: 'REMOVE_HOLDING'; ticker: string }
  | { type: 'CLEAR_HOLDINGS' }
  | { type: 'FETCH_START' }
  | {
    type: 'FETCH_SUCCESS';
    data: ReadonlyMap<string, SecurityResponse>;
    failedTickers: readonly string[];
  }
  | { type: 'FETCH_ERROR'; message: string }
  | {
    type: 'COMPOSITE_BATCH_SETTLED';
    batch: ReadonlyMap<string, SecurityResponse>;
    failedTickers: readonly string[];
  }
  | { type: 'COMPOSITE_LOAD_COMPLETE' }
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'RESET' };

const INITIAL_STATE: PortfolioState = {
  holdings: [],
  securityData: new Map(),
  compositeSecurityData: new Map(),
  phase: 'input',
  errorMessage: null,
  failedTickers: [],
  constituentLoadStatus: 'idle',
  constituentLookupCount: 0,
  failedConstituentTickers: new Set(),
  viewMode: { kind: 'securities' },
};

function reducer(
  state: PortfolioState,
  action: PortfolioAction,
): PortfolioState {
  switch (action.type) {
    case 'ADD_HOLDING': {
      const existing = state.holdings.find(
        (h) => h.ticker === action.holding.ticker,
      );
      if (existing) {
        return {
          ...state,
          holdings: state.holdings.map((h) =>
            h.ticker === action.holding.ticker
              ? {
                ...h,
                quantity: h.quantity + action.holding.quantity,
              }
              : h,
          ),
        };
      }
      return {
        ...state,
        holdings: [...state.holdings, action.holding],
      };
    }
    case 'ADD_HOLDINGS': {
      const merged = [...state.holdings];
      for (const newHolding of action.holdings) {
        const idx = merged.findIndex(
          (h) => h.ticker === newHolding.ticker,
        );
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            quantity: merged[idx].quantity + newHolding.quantity,
          };
        } else {
          merged.push(newHolding);
        }
      }
      return { ...state, holdings: merged };
    }
    case 'REMOVE_HOLDING':
      return {
        ...state,
        holdings: state.holdings.filter(
          (h) => h.ticker !== action.ticker,
        ),
      };
    case 'CLEAR_HOLDINGS':
      return { ...state, holdings: [] };
    case 'FETCH_START':
      return {
        ...state,
        phase: 'loading',
        errorMessage: null,
        failedTickers: [],
        constituentLoadStatus: 'idle',
        constituentLookupCount: 0,
        failedConstituentTickers: new Set(),
      };
    case 'FETCH_SUCCESS': {
      const lookupCount = collectConstituentLookups(action.data).length;
      return {
        ...state,
        phase: 'results',
        securityData: action.data,
        compositeSecurityData: new Map(),
        failedTickers: action.failedTickers,
        constituentLoadStatus: lookupCount > 0 ? 'loading' : 'complete',
        constituentLookupCount: lookupCount,
        failedConstituentTickers: new Set(),
      };
    }
    case 'FETCH_ERROR':
      return {
        ...state,
        phase: 'error',
        errorMessage: action.message,
      };
    case 'COMPOSITE_BATCH_SETTLED':
      return {
        ...state,
        compositeSecurityData: action.batch.size > 0
          ? new Map([...state.compositeSecurityData, ...action.batch])
          : state.compositeSecurityData,
        failedConstituentTickers: action.failedTickers.length > 0
          ? new Set([
            ...state.failedConstituentTickers,
            ...action.failedTickers,
          ])
          : state.failedConstituentTickers,
      };
    case 'COMPOSITE_LOAD_COMPLETE':
      return { ...state, constituentLoadStatus: 'complete' };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.viewMode };
    case 'RESET':
      return INITIAL_STATE;
  }
}

export function PortfolioProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const addHolding = useCallback(
    (ticker: string, quantity: number) => {
      dispatch({
        type: 'ADD_HOLDING',
        holding: { ticker: ticker.toUpperCase(), quantity },
      });
    },
    [],
  );

  const addHoldings = useCallback(
    (holdings: readonly Holding[]) => {
      dispatch({ type: 'ADD_HOLDINGS', holdings });
    },
    [],
  );

  const removeHolding = useCallback((ticker: string) => {
    dispatch({ type: 'REMOVE_HOLDING', ticker });
  }, []);

  const clearHoldings = useCallback(() => {
    dispatch({ type: 'CLEAR_HOLDINGS' });
  }, []);

  const analyzePortfolio = useCallback(async () => {
    if (state.holdings.length === 0) return;

    dispatch({ type: 'FETCH_START' });

    try {
      const tickers = state.holdings.map((h) => h.ticker);
      const result = await fetchSecurities(tickers);

      const overridePrices = new Map<string, number>();
      for (const holding of state.holdings) {
        if (holding.overridePrice !== undefined) {
          overridePrices.set(holding.ticker, holding.overridePrice);
        }
      }

      // A security the backend has never priced (price 0, e.g. a freshly
      // scraped ETF whose Finnhub refresh was rate limited) would value the
      // whole holding at $0.00. Treat it as a failed lookup instead, unless
      // the CSV supplies a price.
      const unpriced = new Map<string, Error>();
      const resolvedData = new Map<string, SecurityResponse>();
      for (const [ticker, security] of result.successes) {
        const overridePrice = overridePrices.get(ticker);
        if (overridePrice !== undefined) {
          resolvedData.set(ticker, { ...security, price: overridePrice });
        } else if (security.price > 0) {
          resolvedData.set(ticker, security);
        } else {
          unpriced.set(ticker, new Error(UNPRICED_MESSAGE));
        }
      }

      const failures = new Map([...result.failures, ...unpriced]);

      // Every failed lookup is reported, even when an override price lets the
      // holding stay in the portfolio: without the API data an ETF can't be
      // flattened, so silently treating it as a plain stock gives wrong results.
      const failedTickers = Array.from(failures.keys());
      for (const [ticker] of failures) {
        const overridePrice = overridePrices.get(ticker);
        if (overridePrice !== undefined) {
          resolvedData.set(ticker, {
            ticker,
            isin: null,
            type: 'stock',
            price: overridePrice,
            tags: [],
            compositeSecurities: [],
            refreshedAt: new Date().toISOString(),
          });
        }
      }

      if (resolvedData.size === 0) {
        dispatch({
          type: 'FETCH_ERROR',
          message: 'Failed to fetch any security data',
        });
        return;
      }

      dispatch({
        type: 'FETCH_SUCCESS',
        data: resolvedData,
        failedTickers,
      });
    } catch (e) {
      dispatch({
        type: 'FETCH_ERROR',
        message: e instanceof Error
          ? e.message
          : 'An unexpected error occurred',
      });
    }
  }, [state.holdings]);

  useEffect(() => {
    if (state.phase !== 'results') return;

    // Only equity constituents have a security doc of their own. Non-equity
    // and unresolved entries keep the provider's raw string as ticker, which
    // can collide with a real doc and would return the wrong security.
    const tickers = collectConstituentLookups(state.securityData);
    if (tickers.length === 0) return;

    let cancelled = false;

    (async () => {
      for (
        let i = 0;
        i < tickers.length;
        i += COMPOSITE_BATCH_SIZE
      ) {
        if (cancelled) return;
        const batch = tickers.slice(
          i,
          i + COMPOSITE_BATCH_SIZE,
        );
        const { successes, failures } = await fetchSecurities(
          batch,
          { skipPriceRefresh: true },
        );

        if (cancelled) return;

        dispatch({
          type: 'COMPOSITE_BATCH_SETTLED',
          batch: successes,
          failedTickers: Array.from(failures.keys()),
        });
      }
      if (!cancelled) dispatch({ type: 'COMPOSITE_LOAD_COMPLETE' });
    })();

    return () => { cancelled = true; };
  }, [state.phase, state.securityData]);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', viewMode });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <PortfolioContext.Provider
      value={{
        state,
        addHolding,
        addHoldings,
        removeHolding,
        clearHoldings,
        analyzePortfolio,
        setViewMode,
        reset,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}
