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
import ButtonBase from '@mui/material/ButtonBase';
import Popover from '@mui/material/Popover';
import type { SxProps, Theme } from '@mui/material/styles';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';
import type { ViewMode } from '../../domain/types';
import { filterSmallAllocations } from '../../domain/display-filter';
import { designColors } from '../../theme/theme';
import {
  formatPercentage,
  formatDollars,
  formatShares,
} from '../../utils/format';

// When more than this many securities are visible, the list is split into
// a top and bottom section with a collapsed (hidden) middle, each expandable.
const SPLIT_THRESHOLD = 40;
const INITIAL_TOP_COUNT = 35;
const INITIAL_BOTTOM_COUNT = 5;
const EXPAND_STEP = 10;
const COLUMN_COUNT = 4;

const cardSx: SxProps<Theme> = {
  border: `1px solid ${designColors.cardBorder}`,
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(20,20,15,0.04)',
  backgroundColor: designColors.surface,
};

const headerCellSx: SxProps<Theme> = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: designColors.headerLabel,
  borderBottom: `1px solid ${designColors.sectionBorder}`,
  py: '13px',
  px: 3,
};

const tickerCellSx: SxProps<Theme> = {
  fontSize: 14,
  fontWeight: 500,
  color: designColors.textPrimary,
  borderBottom: `1px solid ${designColors.rowBorder}`,
  py: '12px',
  px: 3,
};

const numCellSx: SxProps<Theme> = {
  fontSize: 14,
  color: designColors.textBody,
  fontVariantNumeric: 'tabular-nums',
  borderBottom: `1px solid ${designColors.rowBorder}`,
  py: '12px',
  px: 3,
};

const expanderButtonSx: SxProps<Theme> = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  py: '9px',
  px: 2,
  fontSize: 13,
  fontWeight: 500,
  color: designColors.accentText,
  '&:hover': { color: designColors.accentTextHover },
};

interface AllocationListProps {
  readonly viewMode: ViewMode;
  readonly allocations: readonly FlattenedAllocation[];
  readonly tagBreakdown: readonly TagBreakdownEntry[];
}

export function AllocationList({
  viewMode,
  allocations,
  tagBreakdown,
}: AllocationListProps) {
  const [popoverAnchor, setPopoverAnchor] =
    useState<HTMLElement | null>(null);
  const [selectedAllocation, setSelectedAllocation] =
    useState<FlattenedAllocation | null>(null);
  const [topCount, setTopCount] = useState(INITIAL_TOP_COUNT);
  const [bottomCount, setBottomCount] = useState(INITIAL_BOTTOM_COUNT);

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

  const split = useMemo(() => {
    const visible = filtered.visible;
    const total = visible.length;
    const collapsed = total > SPLIT_THRESHOLD
      && topCount + bottomCount < total;

    if (!collapsed) {
      return {
        topRows: visible,
        bottomRows: [] as readonly FlattenedAllocation[],
        showExpanders: false,
        total,
        shownCount: total,
        hiddenCount: 0,
      };
    }

    const topRows = visible.slice(0, topCount);
    const bottomRows = visible.slice(total - bottomCount);
    const shownCount = topRows.length + bottomRows.length;

    return {
      topRows,
      bottomRows,
      showExpanders: true,
      total,
      shownCount,
      hiddenCount: total - shownCount,
    };
  }, [filtered.visible, topCount, bottomCount]);

  const handleShowMoreTop = () => {
    setTopCount((count) => count + EXPAND_STEP);
  };

  const handleShowMoreBottom = () => {
    setBottomCount((count) => count + EXPAND_STEP);
  };

  const handleRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
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
    return (
      <TableContainer component={Paper} elevation={0} sx={cardSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>
                {viewMode.tagName}
              </TableCell>
              <TableCell sx={headerCellSx} align="right">
                Value
              </TableCell>
              <TableCell sx={headerCellSx} align="right">
                Weight
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tagBreakdown.map((entry) => (
              <TableRow key={entry.tagValue}>
                <TableCell sx={tickerCellSx}>
                  {entry.tagValue}
                </TableCell>
                <TableCell sx={numCellSx} align="right">
                  {formatDollars(entry.totalValueCents)}
                </TableCell>
                <TableCell sx={numCellSx} align="right">
                  {formatPercentage(entry.percentage)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  const totalComponentValue = selectedAllocation
    ? selectedAllocation.components.reduce(
      (sum, c) => sum + c.valueCents,
      0,
    )
    : 0;

  const visibleLabel =
    `Showing ${split.shownCount} of ${split.total}`;
  const hiddenLabel = `${split.hiddenCount} holdings hidden`;

  const renderAllocationRow = (a: FlattenedAllocation) => {
    const clickable = a.components.length > 0;
    return (
      <TableRow
        key={a.ticker}
        onClick={(e) => handleRowClick(e, a)}
        sx={{
          '&:hover': { backgroundColor: designColors.surfaceMuted },
          ...(clickable ? { cursor: 'pointer' } : {}),
        }}
      >
        <TableCell sx={tickerCellSx}>{a.ticker}</TableCell>
        <TableCell sx={numCellSx} align="right">
          {a.isUnknown || a.price === null
            ? '-'
            : formatShares(a.totalValueCents / a.price)}
        </TableCell>
        <TableCell sx={numCellSx} align="right">
          {formatDollars(a.totalValueCents)}
        </TableCell>
        <TableCell sx={numCellSx} align="right">
          {formatPercentage(a.percentage)}
        </TableCell>
      </TableRow>
    );
  };

  const expanderBand = (
    <TableRow>
      <TableCell
        colSpan={COLUMN_COUNT}
        sx={{
          p: 0,
          backgroundColor: designColors.surfaceMuted,
          borderTop: `1px solid ${designColors.sectionBorder}`,
          borderBottom: `1px solid ${designColors.sectionBorder}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            py: '10px',
            px: 3,
          }}
        >
          <ButtonBase
            data-testid="show-more-top"
            onClick={handleShowMoreTop}
            sx={{ ...expanderButtonSx, justifyContent: 'flex-end' }}
          >
            <span>Show {EXPAND_STEP} more from top</span>
            <span style={{ fontSize: 15, lineHeight: 1 }}>↓</span>
          </ButtonBase>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 3,
              color: designColors.textMuted,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 13 }}>•••</span>
            <Box
              component="span"
              sx={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: designColors.textSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {hiddenLabel}
            </Box>
            <span style={{ fontSize: 13 }}>•••</span>
          </Box>

          <ButtonBase
            data-testid="show-more-bottom"
            onClick={handleShowMoreBottom}
            sx={{ ...expanderButtonSx, justifyContent: 'flex-start' }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>↑</span>
            <span>Show {EXPAND_STEP} more from bottom</span>
          </ButtonBase>
        </Box>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          mb: 2,
          px: '4px',
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontSize: 18,
            fontWeight: 600,
            color: designColors.textPrimary,
            letterSpacing: '-0.01em',
          }}
        >
          Holdings
        </Typography>
        <Typography
          sx={{
            fontSize: 13,
            color: designColors.textSecondary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {visibleLabel}
        </Typography>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={cardSx}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, width: '22%' }}>
                Ticker
              </TableCell>
              <TableCell
                sx={{ ...headerCellSx, width: '22%' }}
                align="right"
              >
                Shares
              </TableCell>
              <TableCell
                sx={{ ...headerCellSx, width: '26%' }}
                align="right"
              >
                Value
              </TableCell>
              <TableCell
                sx={{ ...headerCellSx, width: '30%' }}
                align="right"
              >
                Weight
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {split.topRows.map(renderAllocationRow)}
            {split.showExpanders && expanderBand}
            {split.bottomRows.map(renderAllocationRow)}
            {filtered.hiddenCount > 0 && (
              <TableRow>
                <TableCell
                  sx={{ ...tickerCellSx, color: designColors.textSecondary }}
                >
                  Everything else
                  ({filtered.hiddenCount} securities)
                </TableCell>
                <TableCell sx={numCellSx} align="right">-</TableCell>
                <TableCell sx={numCellSx} align="right">
                  {formatDollars(filtered.hiddenValueCents)}
                </TableCell>
                <TableCell sx={numCellSx} align="right">
                  {formatPercentage(filtered.hiddenPercentage)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          mt: '14px',
          px: '4px',
          fontSize: '12.5px',
          color: designColors.textMuted,
        }}
      >
        Sorted by weight, descending.
      </Box>

      <Box sx={{ mt: 1 }}>
        <Typography
          variant="body2"
          fontWeight="medium"
          data-testid="total-value"
        >
          Total portfolio value: {formatDollars(totalValueCents)}
        </Typography>
      </Box>

      {unknownPercentage > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            data-testid="unknown-note"
          >
            {formatPercentage(unknownPercentage)} of this
            portfolio is comprised of unknown holdings
            (ETF components with undisclosed proportions).
          </Typography>
        </Box>
      )}

      <Popover
        open={popoverAnchor !== null}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {selectedAllocation && (
          <Box sx={{ p: 2, maxWidth: 360 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {selectedAllocation.ticker} — Source Breakdown
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
                {selectedAllocation.components.map((c) => {
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
    </>
  );
}
