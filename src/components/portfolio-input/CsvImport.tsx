import { useRef, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { Holding } from '../../domain/types';
import {
  parseCsvHoldingsWithReport,
  type CsvSkipReason,
  type SkippedCsvRow,
} from '../../domain/csv-parser';
import { colors } from '../../theme/tokens';

interface CsvImportProps {
  readonly onImport: (holdings: readonly Holding[]) => void;
}

const MAX_LISTED_SKIPPED_ROWS = 5;

const SKIP_REASON_LABELS: Readonly<Record<CsvSkipReason, string>> = {
  'missing-ticker': 'no ticker',
  'missing-quantity': 'no quantity',
  'unparseable-quantity': 'quantity is not a number',
  'non-positive-quantity': 'quantity is zero or negative',
};

function describeSkippedRow(row: SkippedCsvRow): string {
  const ticker = row.ticker ? ` (${row.ticker})` : '';
  return `Line ${row.lineNumber}${ticker}: ${SKIP_REASON_LABELS[row.reason]}`;
}

interface SkippedRowsNoticeProps {
  readonly rows: readonly SkippedCsvRow[];
  readonly onClose: () => void;
}

export function SkippedRowsNotice({ rows, onClose }: SkippedRowsNoticeProps) {
  const listed = rows.slice(0, MAX_LISTED_SKIPPED_ROWS);
  const unlistedCount = rows.length - listed.length;
  const hasNonPositive = rows.some(
    (row) => row.reason === 'non-positive-quantity',
  );
  const rowWord = rows.length === 1 ? 'row' : 'rows';

  return (
    <Alert
      severity="warning"
      onClose={onClose}
      sx={{ mt: 1.5, fontSize: 13 }}
      data-testid="csv-skipped-rows"
    >
      Skipped {rows.length} {rowWord} that could not be imported:
      <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
        {listed.map((row) => (
          <li key={row.lineNumber}>{describeSkippedRow(row)}</li>
        ))}
      </Box>
      {unlistedCount > 0 && (
        <Box sx={{ mt: 0.5 }}>and {unlistedCount} more.</Box>
      )}
      {hasNonPositive && (
        <Box sx={{ mt: 0.5 }}>
          Rows with a negative quantity are not imported, so liabilities
          such as margin loans are not netted off your portfolio total.
        </Box>
      )}
    </Alert>
  );
}

export function CsvImport({ onImport }: CsvImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [skippedRows, setSkippedRows] = useState<readonly SkippedCsvRow[]>(
    [],
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const { holdings, skippedRows: skipped } =
        parseCsvHoldingsWithReport(text);
      setSkippedRows(skipped);
      if (holdings.length > 0) {
        onImport(holdings);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Import CSV"
      />
      <Button
        fullWidth
        onClick={() => fileInputRef.current?.click()}
        sx={{
          height: 48,
          border: `1.5px dashed ${colors.inputBorder}`,
          borderRadius: '10px',
          bgcolor: colors.surface,
          color: colors.accentDeep,
          gap: 1,
          '&:hover': {
            bgcolor: colors.surface,
            borderColor: colors.accent,
          },
        }}
      >
        <Box component="span" sx={{ fontSize: 16 }}>
          ↑
        </Box>
        Import CSV
      </Button>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: 'none', md: 'block' }, mt: 1, lineHeight: 1.5 }}
      >
        Format: SYMBOL, Quantity, Price — include price to value at
        your own prices
      </Typography>
      {skippedRows.length > 0 && (
        <SkippedRowsNotice
          rows={skippedRows}
          onClose={() => setSkippedRows([])}
        />
      )}
    </Box>
  );
}
