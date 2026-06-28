import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useFlattenedAllocations } from '../../hooks/useFlattenedAllocations';
import { useTagBreakdown } from '../../hooks/useTagBreakdown';
import { TagDimensionToggle } from './TagDimensionToggle';
import type { TagDimension } from './TagDimensionToggle';
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
  { key: 'tag', label: 'By tag (beta)' },
];

const eyebrowSx = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  color: '#9a9a8e',
  mb: 0.75,
};

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
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 1.5,
        flexWrap: 'wrap',
        p: { xs: '12px 14px', md: '13px 16px' },
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
        <strong>ETF holding proportions</strong>
        {compositionDate
          ? ` accurate as of ${compositionDate}`
          : ' · reported quarterly'}
      </Chip>
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          flex: 1,
          minWidth: 200,
          fontSize: 12.5,
          color: '#a09a8c',
          textAlign: 'right',
        }}
      >
        Upload prices to refresh values.
      </Box>
    </Box>
  );
}

interface TagCompositionNoteProps {
  readonly dimensionName: string;
  readonly compositionAsOf: Date | null;
}

function TagCompositionNote({
  dimensionName,
  compositionAsOf,
}: TagCompositionNoteProps) {
  const compositionDate = formatDate(compositionAsOf);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        p: '12px 16px',
        bgcolor: colors.surfaceMuted,
        border: '1px solid #efe9df',
        borderRadius: '11px',
        mb: 3.25,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: colors.neutralDot,
          flex: 'none',
        }}
      />
      <Box component="span" sx={{ fontSize: 13, color: '#5b5b52' }}>
        {dimensionName} tags come from each fund's published holdings
        {compositionDate ? (
          <>
            {' — '}
            <Box component="strong" sx={{ color: '#3a3a32' }}>
              composition as of {compositionDate}
            </Box>
          </>
        ) : null}
        . Funds report quarterly, so splits may lag recent moves.
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

  const tagOptions = useMemo<TagDimension[]>(() => {
    const seen = new Set<string>();
    const options: TagDimension[] = [];
    for (const allocation of allocations) {
      for (const tag of allocation.tags) {
        if (!seen.has(tag.key)) {
          seen.add(tag.key);
          options.push({ key: tag.key, name: tag.name });
        }
      }
    }
    return options;
  }, [allocations]);

  const activeTab: TabItem['key'] =
    state.viewMode.kind === 'tag' ? 'tag' : 'holdings';

  const selectDimension = (dimension: TagDimension) => {
    setViewMode({
      kind: 'tag',
      tagKey: dimension.key,
      tagName: dimension.name,
    });
  };

  const handleTabClick = (key: TabItem['key']) => {
    if (key === 'holdings') {
      setViewMode({ kind: 'securities' });
      return;
    }
    if (state.viewMode.kind === 'tag') return;
    const next: ViewMode = tagOptions[0]
      ? {
        kind: 'tag',
        tagKey: tagOptions[0].key,
        tagName: tagOptions[0].name,
      }
      : { kind: 'securities' };
    setViewMode(next);
  };

  const selectedTagName = state.viewMode.kind === 'tag'
    ? state.viewMode.tagName
    : '';

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
          {activeTab === 'holdings' ? (
            <>
              <Box>
                <Typography sx={eyebrowSx}>Your true exposure</Typography>
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: 24, md: 30 }, letterSpacing: '-0.01em' }}
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
            </>
          ) : (
            <>
              <Box>
                <Typography sx={eyebrowSx}>Allocation</Typography>
                <Typography
                  variant="h4"
                  sx={{ fontSize: { xs: 24, md: 30 }, letterSpacing: '-0.01em' }}
                >
                  Grouped by {selectedTagName.toLowerCase()}
                </Typography>
              </Box>
              <TagDimensionToggle
                options={tagOptions}
                selectedKey={tagKey}
                onSelect={selectDimension}
              />
            </>
          )}
        </Box>

        {state.failedTickers.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not fetch data for:{' '}
            {state.failedTickers.join(', ')}
          </Alert>
        )}

        {activeTab === 'holdings' ? (
          <>
            <StalenessChips
              priceAsOf={freshness.priceAsOf}
              compositionAsOf={freshness.compositionAsOf}
            />
            <ConcentrationBar allocations={allocations} />
            <AllocationList
              viewMode={state.viewMode}
              allocations={allocations}
              tagBreakdown={tagBreakdown}
            />
          </>
        ) : (
          <>
            <TagCompositionNote
              dimensionName={selectedTagName}
              compositionAsOf={freshness.compositionAsOf}
            />
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
