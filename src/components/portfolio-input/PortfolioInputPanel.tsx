import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { TickerForm } from './TickerForm';
import { CsvImport } from './CsvImport';
import { HoldingsList } from './HoldingsList';
import { usePortfolio } from '../../hooks/usePortfolio';

export function PortfolioInputPanel() {
  const {
    state,
    addHolding,
    addHoldings,
    removeHolding,
    clearHoldings,
    analyzePortfolio,
  } = usePortfolio();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add Holdings
      </Typography>
      <Stack spacing={2}>
        <TickerForm onAdd={addHolding} />
        <CsvImport onImport={addHoldings} />
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>
        Holdings
      </Typography>
      <HoldingsList
        holdings={state.holdings}
        onRemove={removeHolding}
        onClear={clearHoldings}
        onAnalyze={analyzePortfolio}
        isLoading={state.phase === 'loading'}
      />
    </Box>
  );
}
