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
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="Ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          size="small"
          inputProps={{ 'aria-label': 'Ticker' }}
        />
        <TextField
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          size="small"
          inputProps={{
            'aria-label': 'Quantity',
            min: 0,
            step: 'any',
          }}
        />
        <Button type="submit" variant="contained">
          Add
        </Button>
      </Stack>
    </form>
  );
}
