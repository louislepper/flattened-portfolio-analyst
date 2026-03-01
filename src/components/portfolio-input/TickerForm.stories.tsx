import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TickerForm } from './TickerForm';

const meta: Meta<typeof TickerForm> = {
  title: 'PortfolioInput/TickerForm',
  component: TickerForm,
  args: {
    onAdd: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TickerForm>;

export const Default: Story = {};
