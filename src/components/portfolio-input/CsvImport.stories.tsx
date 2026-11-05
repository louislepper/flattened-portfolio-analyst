import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CsvImport, SkippedRowsNotice } from './CsvImport';

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

export const SkippedRows: Story = {
  render: () => (
    <SkippedRowsNotice
      onClose={fn()}
      rows={[
        { lineNumber: 4, ticker: 'MARGIN', reason: 'non-positive-quantity' },
        { lineNumber: 7, ticker: 'BAD', reason: 'unparseable-quantity' },
        { lineNumber: 9, ticker: null, reason: 'missing-ticker' },
        { lineNumber: 12, ticker: 'LONELY', reason: 'missing-quantity' },
        { lineNumber: 13, ticker: 'ZERO', reason: 'non-positive-quantity' },
        { lineNumber: 15, ticker: 'NEG', reason: 'non-positive-quantity' },
        { lineNumber: 16, ticker: 'NEG2', reason: 'non-positive-quantity' },
      ]}
    />
  ),
};
