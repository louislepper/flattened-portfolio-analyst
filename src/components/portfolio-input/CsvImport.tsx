import { useRef, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { Holding } from '../../domain/types';
import { parseCsvHoldings } from '../../domain/csv-parser';
import { colors } from '../../theme/tokens';

interface CsvImportProps {
  readonly onImport: (holdings: readonly Holding[]) => void;
}

export function CsvImport({ onImport }: CsvImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const holdings = parseCsvHoldings(text);
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
        display="block"
        sx={{ mt: 1, lineHeight: 1.5 }}
      >
        Format: SYMBOL, Quantity, Price — include price to value at
        your own prices
      </Typography>
    </Box>
  );
}
