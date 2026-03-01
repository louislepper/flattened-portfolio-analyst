import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useFlattenedAllocations } from '../../hooks/useFlattenedAllocations';
import { useTagBreakdown } from '../../hooks/useTagBreakdown';
import { TagSearchBar } from './TagSearchBar';
import { AllocationList } from './AllocationList';
import { AllocationPieChart } from './AllocationPieChart';

export function PortfolioView() {
  const { state, setViewMode, reset } = usePortfolio();
  const allocations = useFlattenedAllocations();
  const tagKey = state.viewMode.kind === 'tag'
    ? state.viewMode.tagKey
    : null;
  const tagBreakdown = useTagBreakdown(allocations, tagKey);

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">
          Portfolio Allocation
        </Typography>
        <Button variant="outlined" onClick={reset}>
          New Analysis
        </Button>
      </Stack>

      {state.failedTickers.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Could not fetch data for:{' '}
          {state.failedTickers.join(', ')}
        </Alert>
      )}

      <TagSearchBar
        allocations={allocations}
        viewMode={state.viewMode}
        onViewModeChange={setViewMode}
      />

      <Box sx={{ mt: 2 }}>
        <AllocationList
          viewMode={state.viewMode}
          allocations={allocations}
          tagBreakdown={tagBreakdown}
        />
      </Box>

      <AllocationPieChart
        viewMode={state.viewMode}
        allocations={allocations}
        tagBreakdown={tagBreakdown}
      />
    </Box>
  );
}
