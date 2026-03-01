import type { Meta, StoryObj } from '@storybook/react';
import { PortfolioView } from './PortfolioView';
import { PortfolioProvider } from '../../context/PortfolioContext';

const meta: Meta<typeof PortfolioView> = {
  title: 'PortfolioView/PortfolioView',
  component: PortfolioView,
  decorators: [
    (Story) => (
      <PortfolioProvider>
        <Story />
      </PortfolioProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PortfolioView>;

export const Default: Story = {};
