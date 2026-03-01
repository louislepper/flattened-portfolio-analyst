import { useRef, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { Holding } from '../../domain/types';
import { parseCsvHoldings } from '../../domain/csv-parser';

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
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Import CSV"
      />
      <Button
        variant="outlined"
        startIcon={<UploadFileIcon />}
        onClick={() => fileInputRef.current?.click()}
      >
        Import CSV
      </Button>
    </>
  );
}
