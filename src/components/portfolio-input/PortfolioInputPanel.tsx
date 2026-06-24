import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { TickerForm } from './TickerForm';
import { CsvImport } from './CsvImport';
import { HoldingsList } from './HoldingsList';
import { usePortfolio } from '../../hooks/usePortfolio';
import { colors, fonts } from '../../theme/tokens';

const HERO_POINTS = [
  'Looks through every ETF you hold',
  'Merges overlapping holdings across funds',
  'Ranks your true exposure, company by company',
];

function HeroPanel() {
  return (
    <Box sx={{ p: { xs: '8px 0 24px', md: '52px 48px' } }}>
      <Typography
        sx={{ fontSize: 13, color: colors.accentInk, mb: 2 }}
      >
        A free, open source portfolio tool · nothing is saved
      </Typography>
      <Typography
        component="h2"
        sx={{
          fontFamily: fonts.serif,
          fontWeight: 600,
          fontSize: { xs: 30, md: 44 },
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          color: colors.ink,
          mb: 2.5,
          textWrap: 'balance',
        }}
      >
        See what's actually inside your funds
      </Typography>
      <Typography
        sx={{
          fontSize: 16.5,
          lineHeight: 1.62,
          color: colors.inkBody,
          maxWidth: 520,
          mb: 2,
        }}
      >
        ETFs spread your money across hundreds of companies — but
        several funds can quietly stack you into the same few giants.
        This tool looks through each fund you hold and recombines the
        underlying companies into one view.
      </Typography>
      <Typography
        sx={{
          fontSize: 16.5,
          lineHeight: 1.62,
          color: colors.inkBody,
          maxWidth: 520,
          mb: 3.5,
        }}
      >
        Add your holdings to see your real exposure, company by company.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
        {HERO_POINTS.map((point) => (
          <Box
            key={point}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.4,
              fontSize: 14.5,
              color: '#5b5b52',
            }}
          >
            <Box component="span" sx={{ color: colors.accent }}>
              →
            </Box>
            {point}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function PortfolioInputPanel() {
  const {
    state,
    addHolding,
    addHoldings,
    removeHolding,
    clearHoldings,
    analyzePortfolio,
  } = usePortfolio();

  const hasHoldings = state.holdings.length > 0;

  return (
    <Box
      sx={{
        bgcolor: colors.surface,
        borderRadius: '3px',
        boxShadow: '0 1px 3px rgba(20,20,15,0.1)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
        }}
      >
        <HeroPanel />

        <Box
          sx={{
            p: { xs: '24px 22px 30px', md: '46px 44px' },
            bgcolor: colors.panelBg,
            borderLeft: {
              xs: 'none',
              md: `1px solid ${colors.borderSoft}`,
            },
            borderTop: {
              xs: `1px solid ${colors.borderSoft}`,
              md: 'none',
            },
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontSize: 22, mb: 2.5 }}
          >
            Add Holdings
          </Typography>
          <TickerForm onAdd={addHolding} />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              my: 2,
            }}
          >
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#e7e0d3' }} />
            <Box sx={{ fontSize: 12.5, color: '#a8a89c' }}>or</Box>
            <Box sx={{ flex: 1, height: '1px', bgcolor: '#e7e0d3' }} />
          </Box>
          <CsvImport onImport={addHoldings} />

          {hasHoldings && (
            <Box sx={{ mt: 3.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  mb: 1.5,
                }}
              >
                <Typography variant="h6" sx={{ fontSize: 18 }}>
                  Your holdings{' '}
                  <Box
                    component="span"
                    sx={{
                      fontFamily: fonts.sans,
                      fontWeight: 400,
                      fontSize: 14,
                      color: '#a8a89c',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {state.holdings.length}
                  </Box>
                </Typography>
                <Button
                  size="small"
                  onClick={clearHoldings}
                  disabled={state.phase === 'loading'}
                  sx={{ color: colors.danger, minWidth: 0, p: 0 }}
                >
                  Clear All
                </Button>
              </Box>
              <HoldingsList
                holdings={state.holdings}
                onRemove={removeHolding}
                onAnalyze={analyzePortfolio}
                isLoading={state.phase === 'loading'}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
