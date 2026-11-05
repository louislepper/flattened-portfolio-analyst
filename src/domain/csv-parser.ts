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

export type CsvSkipReason =
  | 'missing-ticker'
  | 'missing-quantity'
  | 'unparseable-quantity'
  | 'non-positive-quantity';

export interface SkippedCsvRow {
  /** 1-based line number in the uploaded file. */
  readonly lineNumber: number;
  /** Uppercased ticker, or null when the row has none. */
  readonly ticker: string | null;
  readonly reason: CsvSkipReason;
}

export interface CsvParseResult {
  readonly holdings: Holding[];
  readonly skippedRows: SkippedCsvRow[];
}

interface CsvLine {
  readonly lineNumber: number;
  readonly text: string;
}

type RowOutcome =
  | {
    readonly kind: 'holding';
    readonly ticker: string;
    readonly quantity: number;
    readonly overridePrice?: number;
  }
  | { readonly kind: 'skipped'; readonly row: SkippedCsvRow };

function parsePrice(parts: readonly string[]): number | undefined {
  if (parts.length < 3) return undefined;
  const priceStr = parts[2];
  const priceUsd = parseNumeric(priceStr);
  return priceStr.length > 0 && !isNaN(priceUsd) && priceUsd > 0
    ? Math.round(priceUsd * 100)
    : undefined;
}

function parseRow({ lineNumber, text }: CsvLine): RowOutcome {
  const parts = parseCsvLine(text);
  const ticker = (parts[0] ?? '').toUpperCase();
  const quantityStr = parts[1] ?? '';
  const skip = (reason: CsvSkipReason): RowOutcome => ({
    kind: 'skipped',
    row: { lineNumber, ticker: ticker.length > 0 ? ticker : null, reason },
  });

  if (ticker.length === 0) return skip('missing-ticker');
  if (quantityStr.length === 0) return skip('missing-quantity');
  const quantity = parseNumeric(quantityStr);
  if (isNaN(quantity)) return skip('unparseable-quantity');
  if (quantity <= 0) return skip('non-positive-quantity');
  return { kind: 'holding', ticker, quantity, overridePrice: parsePrice(parts) };
}

function isHeaderRow(text: string): boolean {
  const firstRow = parseCsvLine(text);
  return firstRow.length >= 2 && isNaN(parseNumeric(firstRow[1]));
}

/**
 * Parses `SYMBOL, Quantity[, Price]` rows, merging repeated tickers. Rows that
 * cannot become a holding are reported in `skippedRows` rather than dropped
 * silently; a leading header row is not a skip.
 */
export function parseCsvHoldingsWithReport(csvText: string): CsvParseResult {
  const lines: CsvLine[] = csvText
    .split(/\r?\n/)
    .map((line, index) => ({ lineNumber: index + 1, text: line.trim() }))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0) return { holdings: [], skippedRows: [] };

  const dataLines = isHeaderRow(lines[0].text) ? lines.slice(1) : lines;
  const outcomes = dataLines.map(parseRow);

  const holdingMap = new Map<string, number>();
  const priceMap = new Map<string, number>();
  const order: string[] = [];

  for (const outcome of outcomes) {
    if (outcome.kind !== 'holding') continue;
    const { ticker, quantity, overridePrice } = outcome;
    if (!holdingMap.has(ticker)) {
      order.push(ticker);
    }
    holdingMap.set(ticker, (holdingMap.get(ticker) ?? 0) + quantity);
    if (overridePrice !== undefined) {
      priceMap.set(ticker, overridePrice);
    }
  }

  const holdings = order.map((ticker) => {
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

  const skippedRows = outcomes.flatMap((outcome) =>
    outcome.kind === 'skipped' ? [outcome.row] : [],
  );

  return { holdings, skippedRows };
}

export function parseCsvHoldings(csvText: string): Holding[] {
  return parseCsvHoldingsWithReport(csvText).holdings;
}
