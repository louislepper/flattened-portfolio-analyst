import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
