import { useState, type FormEvent } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

interface TickerFormProps {
  readonly onAdd: (ticker: string, quantity: number) => void;
}

export function TickerForm({ onAdd }: TickerFormProps) {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedTicker = ticker.trim().toUpperCase();
    const parsedQuantity = Number(quantity);

    if (
      trimmedTicker.length === 0
      || isNaN(parsedQuantity)
      || parsedQuantity <= 0
    ) {
      return;
    }

    onAdd(trimmedTicker, parsedQuantity);
    setTicker('');
    setQuantity('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack direction="row" spacing={1.25} alignItems="flex-end">
        <TextField
          label="Ticker"
          placeholder="e.g. VTI"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          size="small"
          sx={{ flex: 1.3 }}
          inputProps={{ 'aria-label': 'Ticker' }}
        />
        <TextField
          label="Quantity"
          type="number"
          placeholder="120"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          inputProps={{
            'aria-label': 'Quantity',
            min: 0,
            step: 'any',
          }}
        />
        <Button
          type="submit"
          variant="contained"
          sx={{ height: 40, px: 2.5 }}
        >
          Add
        </Button>
      </Stack>
    </form>
  );
}
