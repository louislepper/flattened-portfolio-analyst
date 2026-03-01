import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Holding } from '../../domain/types';

interface HoldingsListProps {
  readonly holdings: readonly Holding[];
  readonly onRemove: (ticker: string) => void;
  readonly onClear: () => void;
  readonly onAnalyze: () => void;
  readonly isLoading: boolean;
}

export function HoldingsList({
  holdings,
  onRemove,
  onClear,
  onAnalyze,
  isLoading,
}: HoldingsListProps) {
  if (holdings.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        No holdings added yet. Use the form above or import
        a CSV file.
      </Typography>
    );
  }

  return (
    <>
      <List dense>
        {holdings.map((holding) => (
          <ListItem
            key={holding.ticker}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label={`Remove ${holding.ticker}`}
                onClick={() => onRemove(holding.ticker)}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={holding.ticker}
              secondary={`${holding.quantity} shares`}
            />
          </ListItem>
        ))}
      </List>
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={onAnalyze}
          disabled={isLoading}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Portfolio'}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onClear}
          disabled={isLoading}
        >
          Clear All
        </Button>
      </Stack>
    </>
  );
}
