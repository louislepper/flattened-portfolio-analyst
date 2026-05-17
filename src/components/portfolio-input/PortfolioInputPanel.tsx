import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Holdings
        </Typography>
        {state.holdings.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={clearHoldings}
            disabled={state.phase === 'loading'}
          >
            Clear All
          </Button>
        )}
      </Box>
      <HoldingsList
        holdings={state.holdings}
        onRemove={removeHolding}
        onAnalyze={analyzePortfolio}
        isLoading={state.phase === 'loading'}
      />
    </Box>
  );
}
