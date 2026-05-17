import type { Holding } from './types';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let field = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          field += line[i++];
        }
      }
      fields.push(field.trim());
      if (i < line.length && line[i] === ',') i++;
    } else {
      const start = i;
      while (i < line.length && line[i] !== ',') i++;
      fields.push(line.slice(start, i).trim());
      if (i < line.length) i++;
    }
  }

  return fields;
}

function parseNumeric(str: string): number {
  return Number(str.replace(/[$,]/g, ''));
}

export function parseCsvHoldings(csvText: string): Holding[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  let startIndex = 0;
  const firstRow = parseCsvLine(lines[0]);
  if (firstRow.length >= 2 && isNaN(parseNumeric(firstRow[1]))) {
    startIndex = 1;
  }

  const holdingMap = new Map<string, number>();
  const priceMap = new Map<string, number>();
  const order: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    if (parts.length < 2) continue;

    const ticker = parts[0].toUpperCase();
    const quantity = parseNumeric(parts[1]);

    if (ticker.length > 0 && !isNaN(quantity) && quantity > 0) {
      if (!holdingMap.has(ticker)) {
        order.push(ticker);
      }
      holdingMap.set(ticker, (holdingMap.get(ticker) ?? 0) + quantity);

      if (parts.length >= 3) {
        const priceStr = parts[2];
        const priceUsd = parseNumeric(priceStr);
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
