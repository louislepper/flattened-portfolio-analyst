import type { Holding } from './types';

export function parseCsvHoldings(csvText: string): Holding[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  let startIndex = 0;
  const firstRow = lines[0].split(',');
  if (firstRow.length >= 2 && isNaN(Number(firstRow[1].trim()))) {
    startIndex = 1;
  }

  const holdings: Holding[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;

    const ticker = parts[0].trim().toUpperCase();
    const quantity = Number(parts[1].trim());

    if (ticker.length > 0 && !isNaN(quantity) && quantity > 0) {
      holdings.push({ ticker, quantity });
    }
  }

  return holdings;
}
