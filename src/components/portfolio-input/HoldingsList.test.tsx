import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoldingsList } from './HoldingsList';

const DEFAULT_PROPS = {
  onRemove: vi.fn(),
  onClear: vi.fn(),
  onAnalyze: vi.fn(),
  isLoading: false,
};

describe('HoldingsList', () => {
  it('shows empty state when no holdings', () => {
    render(
      <HoldingsList {...DEFAULT_PROPS} holdings={[]} />,
    );
    expect(
      screen.getByText(/no holdings added/i),
    ).toBeInTheDocument();
  });

  it('renders holdings', () => {
    const holdings = [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
    ];
    render(
      <HoldingsList {...DEFAULT_PROPS} holdings={holdings} />,
    );
    expect(screen.getByText('GOOG')).toBeInTheDocument();
    expect(
      screen.getByText('10 shares'),
    ).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(
      screen.getByText('5 shares'),
    ).toBeInTheDocument();
  });

  it('calls onRemove when delete button clicked', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <HoldingsList
        {...DEFAULT_PROPS}
        holdings={[{ ticker: 'GOOG', quantity: 10 }]}
        onRemove={onRemove}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Remove GOOG' }),
    );
    expect(onRemove).toHaveBeenCalledWith('GOOG');
  });

  it('calls onAnalyze when analyze button clicked', async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(
      <HoldingsList
        {...DEFAULT_PROPS}
        holdings={[{ ticker: 'GOOG', quantity: 10 }]}
        onAnalyze={onAnalyze}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Analyze Portfolio',
      }),
    );
    expect(onAnalyze).toHaveBeenCalled();
  });

  it('calls onClear when clear button clicked', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(
      <HoldingsList
        {...DEFAULT_PROPS}
        holdings={[{ ticker: 'GOOG', quantity: 10 }]}
        onClear={onClear}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Clear All' }),
    );
    expect(onClear).toHaveBeenCalled();
  });

  it(
    'disables buttons when loading',
    () => {
      render(
        <HoldingsList
          {...DEFAULT_PROPS}
          holdings={[{ ticker: 'GOOG', quantity: 10 }]}
          isLoading={true}
        />,
      );

      expect(
        screen.getByRole('button', { name: /analyzing/i }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Clear All' }),
      ).toBeDisabled();
    },
  );
});
