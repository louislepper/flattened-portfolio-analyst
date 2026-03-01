import {
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { SecurityResponse } from '../api/types';
import type { Holding, ViewMode } from '../domain/types';
import { fetchSecurities } from '../api/client';
import {
  PortfolioContext,
  type PortfolioState,
} from './portfolioContextValue';

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
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'RESET' };

const INITIAL_STATE: PortfolioState = {
  holdings: [],
  securityData: new Map(),
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
        failedTickers: action.failedTickers,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        phase: 'error',
        errorMessage: action.message,
      };
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

      if (result.successes.size === 0) {
        dispatch({
          type: 'FETCH_ERROR',
          message: 'Failed to fetch any security data',
        });
        return;
      }

      dispatch({
        type: 'FETCH_SUCCESS',
        data: result.successes,
        failedTickers: Array.from(result.failures.keys()),
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
