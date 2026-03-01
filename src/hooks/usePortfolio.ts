import { useContext } from 'react';
import {
  PortfolioContext,
  type PortfolioContextValue,
} from '../context/portfolioContextValue';

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error(
      'usePortfolio must be used within a PortfolioProvider',
    );
  }
  return ctx;
}
