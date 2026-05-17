import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HoldingsList } from './HoldingsList';

const meta: Meta<typeof HoldingsList> = {
  title: 'PortfolioInput/HoldingsList',
  component: HoldingsList,
  args: {
    onRemove: fn(),
    onAnalyze: fn(),
    isLoading: false,
  },
};

export default meta;
type Story = StoryObj<typeof HoldingsList>;

export const Empty: Story = {
  args: { holdings: [] },
};

export const WithHoldings: Story = {
  args: {
    holdings: [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
      { ticker: 'AAPL', quantity: 15 },
    ],
  },
};

export const Loading: Story = {
  args: {
    holdings: [
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
    ],
    isLoading: true,
  },
};
