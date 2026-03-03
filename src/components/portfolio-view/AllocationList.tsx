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
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{viewMode.tagName}</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell align="right">%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tagBreakdown.map((entry) => (
              <TableRow key={entry.tagValue}>
                <TableCell>{entry.tagValue}</TableCell>
                <TableCell align="right">
                  {formatDollars(entry.totalValueCents)}
                </TableCell>
                <TableCell align="right">
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

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ticker</TableCell>
              <TableCell align="right">Shares</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell align="right">%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.visible.map((a) => (
              <TableRow
                key={a.ticker}
                hover={a.components.length > 0}
                onClick={(e) => handleRowClick(e, a)}
                sx={a.components.length > 0
                  ? { cursor: 'pointer' }
                  : undefined
                }
              >
                <TableCell>{a.ticker}</TableCell>
                <TableCell align="right">
                  {a.isUnknown
                    ? '-'
                    : formatShares(a.effectiveShares)}
                </TableCell>
                <TableCell align="right">
                  {formatDollars(a.totalValueCents)}
                </TableCell>
                <TableCell align="right">
                  {formatPercentage(a.percentage)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.hiddenCount > 0 && (
              <TableRow>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Everything else
                    ({filtered.hiddenCount} securities)
                  </Typography>
                </TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell align="right">
                  {formatDollars(filtered.hiddenValueCents)}
                </TableCell>
                <TableCell align="right">
                  {formatPercentage(filtered.hiddenPercentage)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
