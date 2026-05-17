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

  const holdingMap = new Map<string, number>();
  const priceMap = new Map<string, number>();
  const order: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;

    const ticker = parts[0].trim().toUpperCase();
    const quantity = Number(parts[1].trim());

    if (ticker.length > 0 && !isNaN(quantity) && quantity > 0) {
      if (!holdingMap.has(ticker)) {
        order.push(ticker);
      }
      holdingMap.set(ticker, (holdingMap.get(ticker) ?? 0) + quantity);

      if (parts.length >= 3) {
        const priceStr = parts[2].trim();
        const priceUsd = Number(priceStr);
        if (priceStr.length > 0 && !isNaN(priceUsd) && priceUsd > 0) {
          priceMap.set(ticker, Math.round(priceUsd * 100));
        }
      }
    }
  }

  return order.map((ticker) => {
    const holding: Holding = {
      ticker,
      quantity: holdingMap.get(ticker)!,
    };
    const overridePrice = priceMap.get(ticker);
    if (overridePrice !== undefined) {
      return { ...holding, overridePrice };
    }
    return holding;
  });
}
