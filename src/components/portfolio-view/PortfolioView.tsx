import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useFlattenedAllocations } from '../../hooks/useFlattenedAllocations';
import { useTagBreakdown } from '../../hooks/useTagBreakdown';
import { TagSearchBar } from './TagSearchBar';
import { AllocationList } from './AllocationList';
import { ConcentrationBar } from './ConcentrationBar';
import { colors, fonts } from '../../theme/tokens';
import { formatDollars, formatDate } from '../../utils/format';
import { computeDataFreshness } from '../../domain/data-freshness';
import type { ViewMode } from '../../domain/types';

interface TabItem {
  readonly key: 'holdings' | 'tag';
  readonly label: string;
}

const TABS: readonly TabItem[] = [
  { key: 'holdings', label: 'Holdings' },
  { key: 'tag', label: 'By tag' },
];

interface StalenessChipsProps {
  readonly priceAsOf: Date | null;
  readonly compositionAsOf: Date | null;
}

function StalenessChips({
  priceAsOf,
  compositionAsOf,
}: StalenessChipsProps) {
  const priceDate = formatDate(priceAsOf);
  const compositionDate = formatDate(compositionAsOf);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        p: '13px 16px',
        bgcolor: colors.surfaceMuted,
        border: `1px solid #efe9df`,
        borderRadius: '11px',
        mb: 3,
      }}
    >
      <Chip dot={colors.warn}>
        <strong>Prices</strong> · delayed
        {priceDate ? ` · close of ${priceDate}` : ''}
      </Chip>
      <Chip dot={colors.neutralDot}>
        <strong>ETF holdings</strong>
        {compositionDate
          ? ` · as of ${compositionDate}`
          : ' · reported quarterly'}
      </Chip>
      <Box
        sx={{
          flex: 1,
          minWidth: 200,
          fontSize: 12.5,
          color: '#a09a8c',
          textAlign: 'right',
        }}
      >
        Upload prices to refresh values. Fund composition is published
        quarterly.
      </Box>
    </Box>
  );
}

function Chip({
  dot,
  children,
}: {
  readonly dot: string;
  readonly children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.625,
        py: 0.75,
        bgcolor: colors.surface,
        border: '1px solid #ece6db',
        borderRadius: '999px',
        fontSize: 13,
        color: '#5b5b52',
      }}
    >
      <Box
        sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dot }}
      />
      <Box component="span">{children}</Box>
    </Box>
  );
}

export function PortfolioView() {
  const { state, setViewMode, reset } = usePortfolio();
  const allocations = useFlattenedAllocations();
  const tagKey = state.viewMode.kind === 'tag'
    ? state.viewMode.tagKey
    : null;
  const tagBreakdown = useTagBreakdown(allocations, tagKey);

  const totalValueCents = useMemo(
    () => allocations.reduce((sum, a) => sum + a.totalValueCents, 0),
    [allocations],
  );
  const companyCount = useMemo(
    () => allocations.filter((a) => !a.isUnknown).length,
    [allocations],
  );

  const freshness = useMemo(
    () => computeDataFreshness(
      state.securityData,
      state.compositeSecurityData,
    ),
    [state.securityData, state.compositeSecurityData],
  );

  const firstTagOption = useMemo(() => {
    for (const allocation of allocations) {
      const tag = allocation.tags[0];
      if (tag) return tag;
    }
    return null;
  }, [allocations]);

  const activeTab: TabItem['key'] =
    state.viewMode.kind === 'tag' ? 'tag' : 'holdings';

  const handleTabClick = (key: TabItem['key']) => {
    if (key === 'holdings') {
      setViewMode({ kind: 'securities' });
      return;
    }
    if (state.viewMode.kind === 'tag') return;
    const next: ViewMode = firstTagOption
      ? {
        kind: 'tag',
        tagKey: firstTagOption.key,
        tagName: firstTagOption.name,
      }
      : { kind: 'securities' };
    setViewMode(next);
  };

  return (
    <Box
      sx={{
        bgcolor: colors.surface,
        borderRadius: '3px',
        boxShadow: '0 1px 3px rgba(20,20,15,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* view switcher + new analysis */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2.5, md: 4 },
          bgcolor: colors.headerBg,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box sx={{ display: 'flex', gap: 3.5 }}>
          {TABS.map((tab) => {
            const selected = tab.key === activeTab;
            return (
              <Box
                key={tab.key}
                role="button"
                tabIndex={0}
                onClick={() => handleTabClick(tab.key)}
                sx={{
                  py: 1.75,
                  fontSize: 14.5,
                  fontWeight: selected ? 600 : 500,
                  color: selected ? colors.ink : '#8a8a7e',
                  borderBottom: `2px solid ${
                    selected ? colors.accent : 'transparent'
                  }`,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </Box>
            );
          })}
        </Box>
        <Button
          variant="outlined"
          onClick={reset}
          sx={{
            border: '1px solid #d8cbb8',
            color: colors.accentDeep,
            fontSize: 13.5,
            py: 0.75,
          }}
        >
          New Analysis
        </Button>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            mb: 2.25,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: colors.inkFaint,
                mb: 0.75,
              }}
            >
              Your true exposure
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontSize: 30, letterSpacing: '-0.01em' }}
            >
              Portfolio Allocation
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                fontFamily: fonts.serif,
                fontSize: 28,
                fontWeight: 600,
                color: colors.ink,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDollars(totalValueCents)}
            </Typography>
            <Typography sx={{ fontSize: 13, color: colors.inkFaint }}>
              {companyCount} companies across your funds
            </Typography>
          </Box>
        </Box>

        {state.failedTickers.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not fetch data for:{' '}
            {state.failedTickers.join(', ')}
          </Alert>
        )}

        <StalenessChips
          priceAsOf={freshness.priceAsOf}
          compositionAsOf={freshness.compositionAsOf}
        />

        {activeTab === 'holdings' ? (
          <>
            <ConcentrationBar allocations={allocations} />
            <AllocationList
              viewMode={state.viewMode}
              allocations={allocations}
              tagBreakdown={tagBreakdown}
            />
          </>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <TagSearchBar
                allocations={allocations}
                viewMode={state.viewMode}
                onViewModeChange={setViewMode}
              />
            </Box>
            <AllocationList
              viewMode={state.viewMode}
              allocations={allocations}
              tagBreakdown={tagBreakdown}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
