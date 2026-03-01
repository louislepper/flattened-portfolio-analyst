import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import type { FlattenedAllocation } from '../../domain/types';
import type { TagBreakdownEntry } from '../../domain/types';
import type { ViewMode } from '../../domain/types';
import { formatPercentage, formatDollars } from '../../utils/format';

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

  return (
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
          {allocations.map((a) => (
            <TableRow key={a.ticker}>
              <TableCell>{a.ticker}</TableCell>
              <TableCell align="right">
                {a.effectiveShares.toFixed(2)}
              </TableCell>
              <TableCell align="right">
                {formatDollars(a.totalValueCents)}
              </TableCell>
              <TableCell align="right">
                {formatPercentage(a.percentage)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
