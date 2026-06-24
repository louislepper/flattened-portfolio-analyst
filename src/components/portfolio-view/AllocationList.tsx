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

export function AllocationList({
  viewMode,
  allocations,
  tagBreakdown,
}: AllocationListProps) {
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
    const maxPct = tagBreakdown.reduce(
      (max, e) => Math.max(max, e.percentage),
      0,
    );
    return (
      <Box>
        <Typography sx={{ ...headCellSx, border: 'none', mb: 1.5 }}>
          {viewMode.tagName}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {tagBreakdown.map((entry) => (
            <Box
              key={entry.tagValue}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, md: 2.25 },
                py: 1.5,
                borderBottom: `1px solid ${colors.borderRow}`,
              }}
            >
              <Box
                sx={{
                  width: { xs: 110, md: 170 },
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1f1f1a',
                }}
              >
                {entry.tagValue}
              </Box>
              <Box
                sx={{
                  flex: 1,
                  height: 12,
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
                    width: maxPct > 0
                      ? `${(entry.percentage / maxPct) * 100}%`
                      : '0%',
                  }}
                />
              </Box>
              <Box
                sx={{
                  ...numSx,
                  width: { xs: 80, md: 120 },
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
          ))}
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
            {filtered.visible.map((a) => (
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
            {filtered.hiddenCount > 0 && (
              <TableRow sx={{ bgcolor: colors.tailBg }}>
                <TableCell>
                  <Typography
                    sx={{ fontSize: 14, fontWeight: 600, color: '#5b4a37' }}
                  >
                    Everything else
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#a89a86' }}>
                    {filtered.hiddenCount} securities
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={numSx}>-</TableCell>
                <TableCell
                  align="right"
                  sx={{ ...numSx, color: '#5b4a37', fontWeight: 600 }}
                >
                  {formatDollars(filtered.hiddenValueCents)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...numSx, color: '#5b4a37', fontWeight: 600 }}
                >
                  {formatPercentage(filtered.hiddenPercentage)}
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
          <Box sx={{ flex: 1, p: '13px 22px' }}>
            <Typography sx={{ ...headCellSx, border: 'none', mb: 0.5 }}>
              Undisclosed (ETF internals)
            </Typography>
            <Typography
              sx={{
                ...numSx,
                fontSize: 15,
                fontWeight: 600,
                color: '#1a1a18',
              }}
            >
              {formatPercentage(unknownPercentage)}
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
            <Typography
              sx={{
                fontFamily: fonts.serif,
                fontSize: 16,
                fontWeight: 600,
                mb: 1,
              }}
            >
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
