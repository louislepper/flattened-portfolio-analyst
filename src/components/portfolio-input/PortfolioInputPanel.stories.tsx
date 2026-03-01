import type { Meta, StoryObj } from '@storybook/react';
import { PortfolioInputPanel } from './PortfolioInputPanel';
import { PortfolioProvider } from '../../context/PortfolioContext';

const meta: Meta<typeof PortfolioInputPanel> = {
  title: 'PortfolioInput/PortfolioInputPanel',
  component: PortfolioInputPanel,
  decorators: [
    (Story) => (
      <PortfolioProvider>
        <Story />
      </PortfolioProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PortfolioInputPanel>;

export const Default: Story = {};
