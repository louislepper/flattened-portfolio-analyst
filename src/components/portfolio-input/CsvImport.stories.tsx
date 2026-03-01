import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CsvImport } from './CsvImport';

const meta: Meta<typeof CsvImport> = {
  title: 'PortfolioInput/CsvImport',
  component: CsvImport,
  args: {
    onImport: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CsvImport>;

export const Default: Story = {};
