import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { Holding } from '../../domain/types';
import { colors, fonts } from '../../theme/tokens';

interface HoldingsListProps {
  readonly holdings: readonly Holding[];
  readonly onRemove: (ticker: string) => void;
  readonly onAnalyze: () => void;
  readonly isLoading: boolean;
}

export function HoldingsList({
  holdings,
  onRemove,
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
      <Box
        role="list"
        sx={{
          border: `1px solid ${colors.borderSoft}`,
          borderRadius: '12px',
          overflow: 'hidden',
          maxHeight: 320,
          overflowY: 'auto',
          mb: 2,
        }}
      >
        {holdings.map((holding) => (
          <Box
            key={holding.ticker}
            role="listitem"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${colors.borderRow}`,
              '&:last-of-type': { borderBottom: 'none' },
              '&:hover': { bgcolor: colors.surfaceMuted },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '9px',
                  bgcolor: '#f4ede2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: colors.accentInk,
                }}
              >
                {holding.ticker.slice(0, 2)}
              </Box>
              <Box>
                <Typography
                  sx={{ fontSize: 14, fontWeight: 600, color: '#1f1f1a' }}
                >
                  {holding.ticker}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: colors.inkFaint,
                    fontFamily: fonts.sans,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {holding.quantity} shares
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              aria-label={`Remove ${holding.ticker}`}
              onClick={() => onRemove(holding.ticker)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '7px',
                border: '1px solid #ece6db',
                color: '#b8a99a',
                fontSize: 13,
              }}
            >
              ✕
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button
        fullWidth
        onClick={onAnalyze}
        disabled={isLoading}
        sx={{
          height: 50,
          bgcolor: colors.ctaDark,
          color: '#fff',
          fontSize: 15,
          '&:hover': { bgcolor: '#000' },
        }}
      >
        {isLoading ? 'Analyzing...' : 'Analyze Portfolio'}
      </Button>
    </>
  );
}
