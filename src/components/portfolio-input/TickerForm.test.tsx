import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TickerForm } from './TickerForm';

describe('TickerForm', () => {
  it('renders ticker and quantity inputs', () => {
    render(<TickerForm onAdd={vi.fn()} />);
    expect(
      screen.getByLabelText('Ticker'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Quantity'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add holding' }),
    ).toBeInTheDocument();
  });

  it('calls onAdd with uppercase ticker and quantity', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<TickerForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText('Ticker'), 'goog');
    await user.type(screen.getByLabelText('Quantity'), '10');
    await user.click(
      screen.getByRole('button', { name: 'Add holding' }),
    );

    expect(onAdd).toHaveBeenCalledWith('GOOG', 10);
  });

  it('clears form after successful add', async () => {
    const user = userEvent.setup();
    render(<TickerForm onAdd={vi.fn()} />);

    const tickerInput = screen.getByLabelText('Ticker');
    const quantityInput = screen.getByLabelText('Quantity');

    await user.type(tickerInput, 'GOOG');
    await user.type(quantityInput, '10');
    await user.click(
      screen.getByRole('button', { name: 'Add holding' }),
    );

    expect(tickerInput).toHaveValue('');
    expect(quantityInput).toHaveValue(null);
  });

  it('does not call onAdd with empty ticker', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<TickerForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText('Quantity'), '10');
    await user.click(
      screen.getByRole('button', { name: 'Add holding' }),
    );

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('does not call onAdd with zero quantity', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<TickerForm onAdd={onAdd} />);

    await user.type(screen.getByLabelText('Ticker'), 'GOOG');
    await user.type(screen.getByLabelText('Quantity'), '0');
    await user.click(
      screen.getByRole('button', { name: 'Add holding' }),
    );

    expect(onAdd).not.toHaveBeenCalled();
  });
});
