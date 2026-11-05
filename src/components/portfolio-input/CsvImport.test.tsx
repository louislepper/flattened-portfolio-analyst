import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CsvImport } from './CsvImport';

describe('CsvImport', () => {
  it('renders import button', () => {
    render(<CsvImport onImport={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /import csv/i }),
    ).toBeInTheDocument();
  });

  it('parses CSV file and calls onImport', async () => {
    const onImport = vi.fn();
    const user = userEvent.setup();
    render(<CsvImport onImport={onImport} />);

    const csvContent = 'GOOG,10\nMSFT,5';
    const file = new File([csvContent], 'holdings.csv', {
      type: 'text/csv',
    });

    const input = screen.getByLabelText('Import CSV');
    await user.upload(input, file);

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith([
        { ticker: 'GOOG', quantity: 10 },
        { ticker: 'MSFT', quantity: 5 },
      ]);
    });
  });

  it(
    'does not call onImport for empty CSV',
    async () => {
      const onImport = vi.fn();
      const user = userEvent.setup();
      render(<CsvImport onImport={onImport} />);

      const file = new File([''], 'empty.csv', {
        type: 'text/csv',
      });

      const input = screen.getByLabelText('Import CSV');
      await user.upload(input, file);

      await waitFor(() => {
        expect(onImport).not.toHaveBeenCalled();
      });
    },
  );

  describe('skipped rows notice', () => {
    async function upload(csv: string, onImport = vi.fn()) {
      const user = userEvent.setup();
      render(<CsvImport onImport={onImport} />);
      const file = new File([csv], 'holdings.csv', { type: 'text/csv' });
      await user.upload(screen.getByLabelText('Import CSV'), file);
      return { user, onImport };
    }

    it('is not shown when nothing was skipped', async () => {
      const { onImport } = await upload('Symbol,Quantity\nGOOG,10');
      await waitFor(() => expect(onImport).toHaveBeenCalled());
      expect(screen.queryByTestId('csv-skipped-rows')).not.toBeInTheDocument();
    });

    it('lists each skip reason with its line', async () => {
      await upload([
        'Symbol,Quantity',
        'GOOG,10',
        'BAD,abc',
        ',5',
        'LONELY',
        'ZERO,0',
      ].join('\n'));

      const notice = await screen.findByTestId('csv-skipped-rows');
      expect(notice).toHaveTextContent(
        'Skipped 4 rows that could not be imported',
      );
      expect(notice).toHaveTextContent('Line 3 (BAD): quantity is not a number');
      expect(notice).toHaveTextContent('Line 4: no ticker');
      expect(notice).toHaveTextContent('Line 5 (LONELY): no quantity');
      expect(notice).toHaveTextContent(
        'Line 6 (ZERO): quantity is zero or negative',
      );
    });

    it('explains that negative rows such as margin loans are not netted', async () => {
      const { onImport } = await upload(
        'Symbol,Quantity,Price\nAMZN,2,100\nMARGIN,"-101,000",1',
      );

      const notice = await screen.findByTestId('csv-skipped-rows');
      expect(notice).toHaveTextContent('Skipped 1 row that could');
      expect(notice).toHaveTextContent(
        'liabilities such as margin loans are not netted off your portfolio '
        + 'total',
      );
      expect(onImport).toHaveBeenCalledWith([
        { ticker: 'AMZN', quantity: 2, overridePrice: 10000 },
      ]);
    });

    it('does not mention margin loans when no row was negative', async () => {
      await upload('GOOG,10\nBAD,abc');

      const notice = await screen.findByTestId('csv-skipped-rows');
      expect(notice).not.toHaveTextContent('margin');
    });

    it('shows the first five rows and a count of the rest', async () => {
      const rows = Array.from({ length: 12 }, (_, i) => `NEG${i},-1`);
      await upload(['Symbol,Quantity', 'GOOG,1', ...rows].join('\n'));

      const notice = await screen.findByTestId('csv-skipped-rows');
      expect(notice).toHaveTextContent('Skipped 12 rows');
      expect(within(notice).getAllByRole('listitem')).toHaveLength(5);
      expect(notice).toHaveTextContent('Line 3 (NEG0)');
      expect(notice).toHaveTextContent('Line 7 (NEG4)');
      expect(notice).not.toHaveTextContent('NEG5');
      expect(notice).toHaveTextContent('and 7 more.');
    });

    it('is shown even when every row was skipped', async () => {
      const { onImport } = await upload('GOOG,-1');

      expect(await screen.findByTestId('csv-skipped-rows')).toBeInTheDocument();
      expect(onImport).not.toHaveBeenCalled();
    });

    it('can be dismissed, and clears on a clean re-import', async () => {
      const { user } = await upload('GOOG,10\nBAD,abc');
      await screen.findByTestId('csv-skipped-rows');

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByTestId('csv-skipped-rows')).not.toBeInTheDocument();

      await user.upload(
        screen.getByLabelText('Import CSV'),
        new File(['GOOG,1\nBAD,x'], 'a.csv', { type: 'text/csv' }),
      );
      await screen.findByTestId('csv-skipped-rows');
      await user.upload(
        screen.getByLabelText('Import CSV'),
        new File(['GOOG,1'], 'b.csv', { type: 'text/csv' }),
      );
      await waitFor(() => {
        expect(screen.queryByTestId('csv-skipped-rows'))
          .not.toBeInTheDocument();
      });
    });
  });
});
