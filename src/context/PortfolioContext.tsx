import {
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { SecurityResponse } from '../api/types';
import type { Holding, ViewMode } from '../domain/types';
import { fetchSecurity } from '../api/client';
import { fetchSecurities } from '../api/client';
import {
  PortfolioContext,
  type PortfolioState,
} from './portfolioContextValue';

const COMPOSITE_BATCH_SIZE = 20;
const VALID_TICKER_PATTERN = /^[A-Z0-9._-]+$/;

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
    type: 'COMPOSITE_BATCH_SUCCESS';
    batch: ReadonlyMap<string, SecurityResponse>;
  }
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'RESET' };

const INITIAL_STATE: PortfolioState = {
  holdings: [],
  securityData: new Map(),
  compositeSecurityData: new Map(),
  phase: 'input',
  errorMessage: null,
  failedTickers: [],
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
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        phase: 'results',
        securityData: action.data,
        compositeSecurityData: new Map(),
        failedTickers: action.failedTickers,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        phase: 'error',
        errorMessage: action.message,
      };
    case 'COMPOSITE_BATCH_SUCCESS': {
      const merged = new Map(state.compositeSecurityData);
      for (const [ticker, data] of action.batch) {
        merged.set(ticker, data);
      }
      return {
        ...state,
        compositeSecurityData: merged,
      };
    }
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

      const resolvedData = new Map<string, SecurityResponse>();
      for (const [ticker, security] of result.successes) {
        const overridePrice = overridePrices.get(ticker);
        resolvedData.set(
          ticker,
          overridePrice !== undefined
            ? { ...security, price: overridePrice }
            : security,
        );
      }

      const failedTickers: string[] = [];
      for (const [ticker] of result.failures) {
        const overridePrice = overridePrices.get(ticker);
        if (overridePrice !== undefined) {
          resolvedData.set(ticker, {
            ticker,
            type: 'stock',
            price: overridePrice,
            tags: [],
            compositeSecurities: [],
            refreshedAt: new Date().toISOString(),
          });
        } else {
          failedTickers.push(ticker);
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

    const compositeTickers = new Set<string>();
    for (const security of state.securityData.values()) {
      if (security.type !== 'etf') continue;
      for (const composite of security.compositeSecurities) {
        if (!state.securityData.has(composite.ticker)) {
          compositeTickers.add(composite.ticker);
        }
      }
    }

    if (compositeTickers.size === 0) return;

    let cancelled = false;
    const tickers = Array.from(compositeTickers).filter(
      (t) => VALID_TICKER_PATTERN.test(t.toUpperCase()),
    );

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
        const results = await Promise.allSettled(
          batch.map(async (ticker) => ({
            ticker,
            data: await fetchSecurity(ticker),
          })),
        );

        if (cancelled) return;

        const batchMap = new Map<string, SecurityResponse>();
        for (const result of results) {
          if (result.status === 'fulfilled') {
            batchMap.set(
              result.value.ticker,
              result.value.data,
            );
          }
        }

        if (batchMap.size > 0) {
          dispatch({
            type: 'COMPOSITE_BATCH_SUCCESS',
            batch: batchMap,
          });
        }
      }
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
