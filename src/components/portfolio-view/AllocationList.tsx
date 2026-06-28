import { useState, useMemo } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';
import type { ViewMode } from '../../domain/types';
import { filterSmallAllocations } from '../../domain/display-filter';
import {
  formatPercentage,
  formatDollars,
  formatShares,
} from '../../utils/format';
import { colors, fonts } from '../../theme/tokens';

interface AllocationListProps {
  readonly viewMode: ViewMode;
  readonly allocations: readonly FlattenedAllocation[];
  readonly tagBreakdown: readonly TagBreakdownEntry[];
}

const DEFAULT_VISIBLE_ROWS = 12;
const EXPAND_STEP = 10;

const headCellSx = {
  fontFamily: fonts.sans,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#9a9a92',
  borderBottom: '1px solid #ededea',
  py: 1.5,
};

const numSx = {
  fontVariantNumeric: 'tabular-nums',
  fontSize: 14,
};

interface SourceBreakdownPopoverProps {
  readonly anchor: HTMLElement | null;
  readonly allocation: FlattenedAllocation | null;
  readonly totalComponentValue: number;
  readonly onClose: () => void;
}

function SourceBreakdownPopover({
  anchor,
  allocation,
  totalComponentValue,
  onClose,
}: SourceBreakdownPopoverProps) {
  return (
    <Popover
      open={anchor !== null}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      {allocation && (
        <Box sx={{ p: 2, maxWidth: 360 }}>
          <Typography
            sx={{
              fontFamily: fonts.serif,
              fontSize: 16,
              fontWeight: 600,
              mb: 1,
            }}
          >
            {allocation.ticker} — Source Breakdown
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Source</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="right">%</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allocation.components.map((c) => {
                const pct = totalComponentValue > 0
                  ? c.valueCents / totalComponentValue
                  : 0;
                return (
                  <TableRow key={c.fromTicker}>
                    <TableCell>{c.fromTicker}</TableCell>
                    <TableCell align="right">
                      {formatDollars(c.valueCents)}
                    </TableCell>
                    <TableCell align="right">
                      {formatPercentage(pct)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Popover>
  );
}

export function AllocationList({
  viewMode,
  allocations,
  tagBreakdown,
}: AllocationListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [popoverAnchor, setPopoverAnchor] =
    useState<HTMLElement | null>(null);
  const [selectedAllocation, setSelectedAllocation] =
    useState<FlattenedAllocation | null>(null);

  const filtered = useMemo(
    () => filterSmallAllocations(allocations),
    [allocations],
  );

  const totalValueCents = useMemo(
    () => allocations.reduce(
      (sum, a) => sum + a.totalValueCents,
      0,
    ),
    [allocations],
  );

  const unknownPercentage = useMemo(
    () => allocations
      .filter((a) => a.isUnknown)
      .reduce((sum, a) => sum + a.percentage, 0),
    [allocations],
  );

  const distinctCompanies = useMemo(
    () => allocations.filter((a) => !a.isUnknown).length,
    [allocations],
  );

  const [shownCount, setShownCount] = useState(DEFAULT_VISIBLE_ROWS);

  const tail = useMemo(() => {
    const shown = filtered.visible.slice(0, shownCount);
    const overflow = filtered.visible.slice(shownCount);
    const count = overflow.length + filtered.hiddenCount;
    const valueCents =
      overflow.reduce((sum, a) => sum + a.totalValueCents, 0)
      + filtered.hiddenValueCents;
    const percentage =
      overflow.reduce((sum, a) => sum + a.percentage, 0)
      + filtered.hiddenPercentage;
    const threshold = shown.length > 0
      ? shown[shown.length - 1].totalValueCents
      : 0;
    return {
      shown,
      count,
      valueCents,
      percentage,
      threshold,
      canExpand: overflow.length > 0,
    };
  }, [filtered, shownCount]);

  const handleRowClick = (
    event: React.MouseEvent<HTMLElement>,
    allocation: FlattenedAllocation,
  ) => {
    if (allocation.components.length === 0) return;
    setPopoverAnchor(event.currentTarget);
    setSelectedAllocation(allocation);
  };

  const handlePopoverClose = () => {
    setPopoverAnchor(null);
    setSelectedAllocation(null);
  };

  if (viewMode.kind === 'tag') {
    const maxPct = tagBreakdown.reduce(
      (max, e) => Math.max(max, e.percentage),
      0,
    );
    return (
      <Box>
        <Typography sx={{ ...headCellSx, border: 'none', mb: 1.5 }}>
          {viewMode.tagName}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.75, md: 0 },
          }}
        >
          {tagBreakdown.map((entry) => {
            const barWidth = maxPct > 0
              ? `${(entry.percentage / maxPct) * 100}%`
              : '0%';
            const bar = (
              <Box
                sx={{
                  flex: 1,
                  height: { xs: 10, md: 12 },
                  borderRadius: '6px',
                  bgcolor: '#f0efe9',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    borderRadius: '6px',
                    bgcolor: colors.accent,
                    width: barWidth,
                  }}
                />
              </Box>
            );

            if (isMobile) {
              return (
                <Box key={entry.tagValue}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      mb: 0.75,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: '#1f1f1a',
                      }}
                    >
                      {entry.tagValue}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        ...numSx,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: '#1a1a18',
                      }}
                    >
                      {formatPercentage(entry.percentage)}
                    </Box>
                  </Box>
                  {bar}
                </Box>
              );
            }

            return (
              <Box
                key={entry.tagValue}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2.25,
                  py: 1.5,
                  borderBottom: `1px solid ${colors.borderRow}`,
                }}
              >
                <Box
                  sx={{
                    width: 170,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1f1f1a',
                  }}
                >
                  {entry.tagValue}
                </Box>
                {bar}
                <Box
                  sx={{
                    ...numSx,
                    width: 120,
                    textAlign: 'right',
                    color: '#46463f',
                  }}
                >
                  {formatDollars(entry.totalValueCents)}
                </Box>
                <Box
                  sx={{
                    ...numSx,
                    width: 56,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#1a1a18',
                  }}
                >
                  {formatPercentage(entry.percentage)}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  const totalComponentValue = selectedAllocation
    ? selectedAllocation.components.reduce(
      (sum, c) => sum + c.valueCents,
      0,
    )
    : 0;

  if (isMobile) {
    return (
      <>
        <Box
          sx={{
            border: `1px solid ${colors.borderTable}`,
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {tail.shown.map((a) => (
            <Box
              key={a.ticker}
              onClick={(e) => handleRowClick(e, a)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: 1.875,
                py: 1.375,
                borderBottom: `1px solid ${colors.borderRow}`,
                '&:last-of-type': { borderBottom: 'none' },
                cursor: a.components.length > 0 ? 'pointer' : 'default',
                '&:hover': a.components.length > 0
                  ? { bgcolor: colors.surfaceMuted }
                  : undefined,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box
                  sx={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}
                >
                  {a.ticker}
                </Box>
                <Box sx={{ ...numSx, fontSize: 11.5, color: '#9a9a8e' }}>
                  {a.isUnknown || a.price === null
                    ? 'undisclosed'
                    : `${formatShares(a.totalValueCents / a.price)} sh`}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right', flex: 'none' }}>
                <Box
                  sx={{
                    ...numSx,
                    fontWeight: 600,
                    color: '#1a1a18',
                  }}
                >
                  {formatPercentage(a.percentage)}
                </Box>
                <Box sx={{ ...numSx, fontSize: 11.5, color: '#9a9a8e' }}>
                  {formatDollars(a.totalValueCents)}
                </Box>
              </Box>
            </Box>
          ))}

          {tail.count > 0 && (
            <Box
              sx={{
                px: 1.875,
                py: 1.625,
                bgcolor: colors.tailBg,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  mb: 0.375,
                }}
              >
                <Box
                  component="span"
                  sx={{ fontSize: 14, fontWeight: 600, color: '#5b4a37' }}
                >
                  Everything else
                </Box>
                <Box
                  component="span"
                  sx={{
                    ...numSx,
                    fontWeight: 600,
                    color: '#5b4a37',
                  }}
                >
                  {formatPercentage(tail.percentage)}
                </Box>
              </Box>
              <Box
                sx={{
                  fontSize: 11.5,
                  color: '#a89a86',
                  mb: tail.canExpand ? 1.25 : 0,
                }}
              >
                <Box
                  component="span"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {tail.count} securities
                </Box>
                {', each ≤ '}
                <Box
                  component="span"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatDollars(tail.threshold)}
                </Box>
              </Box>
              {tail.canExpand && (
                <Button
                  fullWidth
                  onClick={() => setShownCount((c) => c + EXPAND_STEP)}
                  sx={{
                    height: 42,
                    border: '1px solid #d8c8b2',
                    borderRadius: '9px',
                    bgcolor: colors.surface,
                    color: colors.accentDeep,
                    fontSize: 13,
                    '&:hover': { bgcolor: '#faf6f0' },
                  }}
                >
                  Show {EXPAND_STEP} more ↓
                </Button>
              )}
            </Box>
          )}
        </Box>

        {unknownPercentage > 0 && (
          <Typography
            data-testid="unknown-note"
            sx={{ mt: 1.5, fontSize: 12.5, color: colors.inkMuted }}
          >
            {formatPercentage(unknownPercentage)} of this portfolio is
            comprised of unknown holdings (ETF components with
            undisclosed proportions).
          </Typography>
        )}

        <SourceBreakdownPopover
          anchor={popoverAnchor}
          allocation={selectedAllocation}
          totalComponentValue={totalComponentValue}
          onClose={handlePopoverClose}
        />
      </>
    );
  }

  return (
    <>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: `1px solid ${colors.borderTable}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>Ticker</TableCell>
              <TableCell align="right" sx={headCellSx}>Shares</TableCell>
              <TableCell align="right" sx={headCellSx}>Value</TableCell>
              <TableCell align="right" sx={headCellSx}>%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tail.shown.map((a) => (
              <TableRow
                key={a.ticker}
                hover={a.components.length > 0}
                onClick={(e) => handleRowClick(e, a)}
                sx={{
                  cursor: a.components.length > 0
                    ? 'pointer'
                    : 'default',
                  '& td': {
                    borderBottom: `1px solid ${colors.borderRow}`,
                  },
                }}
              >
                <TableCell
                  sx={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}
                >
                  {a.ticker}
                </TableCell>
                <TableCell align="right" sx={numSx}>
                  {a.isUnknown || a.price === null
                    ? '-'
                    : formatShares(
                      a.totalValueCents / a.price,
                    )}
                </TableCell>
                <TableCell align="right" sx={{ ...numSx, color: '#46463f' }}>
                  {formatDollars(a.totalValueCents)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...numSx, fontWeight: 600, color: '#1a1a18' }}
                >
                  {formatPercentage(a.percentage)}
                </TableCell>
              </TableRow>
            ))}
            {tail.count > 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ p: 0, border: 'none' }}>
                  <Box
                    onClick={tail.canExpand
                      ? () => setShownCount((c) => c + EXPAND_STEP)
                      : undefined}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: '16px 22px',
                      bgcolor: colors.tailBg,
                      borderTop: `1px solid ${colors.border}`,
                      cursor: tail.canExpand ? 'pointer' : 'default',
                      '&:hover': tail.canExpand
                        ? { bgcolor: '#f2ede4' }
                        : undefined,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 1,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#5b4a37',
                          }}
                        >
                          Everything else
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            fontSize: 12.5,
                            color: '#9a8d7a',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {tail.count} securities
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          fontSize: 12,
                          color: '#a89a86',
                          mt: 0.375,
                        }}
                      >
                        each company ≤{' '}
                        <Box
                          component="span"
                          sx={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatDollars(tail.threshold)}
                        </Box>
                        {' '}· smaller than every row above
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Box
                        sx={{
                          ...numSx,
                          fontWeight: 600,
                          color: '#5b4a37',
                        }}
                      >
                        {formatDollars(tail.valueCents)}
                      </Box>
                      <Box
                        sx={{
                          ...numSx,
                          fontSize: 12.5,
                          color: '#9a8d7a',
                        }}
                      >
                        {formatPercentage(tail.percentage)}
                      </Box>
                    </Box>
                    {tail.canExpand && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShownCount((c) => c + EXPAND_STEP);
                        }}
                        sx={{
                          border: '1px solid #d8c8b2',
                          borderRadius: '8px',
                          bgcolor: colors.surface,
                          color: colors.accentDeep,
                          fontSize: 12.5,
                          py: 1,
                          px: 1.75,
                          whiteSpace: 'nowrap',
                          '&:hover': { bgcolor: '#faf6f0' },
                        }}
                      >
                        Show {EXPAND_STEP} more ↓
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box sx={{ display: 'flex', borderTop: '1px solid #ededea' }}>
          <Box
            sx={{
              flex: 1,
              p: '13px 22px',
              borderRight: '1px solid #f1f0ec',
            }}
          >
            <Typography sx={{ ...headCellSx, border: 'none', mb: 0.5 }}>
              Total value
            </Typography>
            <Typography
              data-testid="total-value"
              sx={{
                ...numSx,
                fontSize: 15,
                fontWeight: 600,
                color: '#1a1a18',
              }}
            >
              {formatDollars(totalValueCents)}
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              p: '13px 22px',
              borderRight: '1px solid #f1f0ec',
            }}
          >
            <Typography sx={{ ...headCellSx, border: 'none', mb: 0.5 }}>
              Distinct companies
            </Typography>
            <Typography
              sx={{
                ...numSx,
                fontSize: 15,
                fontWeight: 600,
                color: '#1a1a18',
              }}
            >
              {distinctCompanies.toLocaleString('en-US')}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, p: '13px 22px' }}>
            <Typography sx={{ ...headCellSx, border: 'none', mb: 0.5 }}>
              Allocated
            </Typography>
            <Typography
              sx={{
                ...numSx,
                fontSize: 15,
                fontWeight: 600,
                color: '#1a1a18',
              }}
            >
              {formatPercentage(1 - unknownPercentage)}
            </Typography>
          </Box>
        </Box>
      </TableContainer>

      {unknownPercentage > 0 && (
        <Typography
          data-testid="unknown-note"
          sx={{ mt: 1.5, fontSize: 12.5, color: colors.inkMuted }}
        >
          {formatPercentage(unknownPercentage)} of this portfolio is
          comprised of unknown holdings (ETF components with
          undisclosed proportions).
        </Typography>
      )}

      <SourceBreakdownPopover
        anchor={popoverAnchor}
        allocation={selectedAllocation}
        totalComponentValue={totalComponentValue}
        onClose={handlePopoverClose}
      />
    </>
  );
}
