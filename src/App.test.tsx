import { describe, it, expect } from 'vitest';
import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

async function addHolding(
  user: ReturnType<typeof userEvent.setup>,
  ticker: string,
  quantity: string,
) {
  const tickerInput = screen.getByLabelText('Ticker');
  const quantityInput = screen.getByLabelText('Quantity');
  const addButton = screen.getByRole('button', { name: 'Add' });

  await user.clear(tickerInput);
  await user.type(tickerInput, ticker);
  await user.clear(quantityInput);
  await user.type(quantityInput, quantity);
  await user.click(addButton);
}

describe('App integration', () => {
  it(
    'full portfolio analysis flow with ETF',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      expect(
        screen.getByText('Flattened Portfolio Analyst'),
      ).toBeInTheDocument();

      await addHolding(user, 'GOOG', '10');
      expect(screen.getByText('GOOG')).toBeInTheDocument();

      await addHolding(user, 'TECH_ETF', '5');
      expect(
        screen.getByText('TECH_ETF'),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', {
          name: 'Analyze Portfolio',
        }),
      );

      await waitFor(
        () => {
          expect(
            screen.getByText('Portfolio Allocation'),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const table = screen.getByRole('table');
      expect(
        within(table).getByText('GOOG'),
      ).toBeInTheDocument();
      expect(
        within(table).getByText('MSFT'),
      ).toBeInTheDocument();
      expect(
        within(table).getByText('AAPL'),
      ).toBeInTheDocument();

      // Reset to input
      await user.click(
        screen.getByRole('button', {
          name: 'New Analysis',
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('Add Holdings'),
        ).toBeInTheDocument();
      });
    },
    15000,
  );

  it(
    'direct stock holdings only',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await addHolding(user, 'GOOG', '10');
      await addHolding(user, 'AAPL', '5');

      // Verify both holdings are listed
      const holdingsList = screen.getAllByRole('listitem');
      expect(holdingsList).toHaveLength(2);

      await user.click(
        screen.getByRole('button', {
          name: 'Analyze Portfolio',
        }),
      );

      await waitFor(
        () => {
          expect(
            screen.getByText('Portfolio Allocation'),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const table = screen.getByRole('table');
      expect(
        within(table).getByText('GOOG'),
      ).toBeInTheDocument();
      expect(
        within(table).getByText('AAPL'),
      ).toBeInTheDocument();
    },
    15000,
  );
});
