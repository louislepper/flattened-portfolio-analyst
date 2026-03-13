import { describe, it, expect } from 'vitest';
import { parseCsvHoldings } from './csv-parser';

describe('parseCsvHoldings', () => {
  it('parses simple ticker,quantity rows', () => {
    const csv = 'GOOG,10\nMSFT,5\nAAPL,3';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
      { ticker: 'AAPL', quantity: 3 },
    ]);
  });

  it('auto-detects and skips header row', () => {
    const csv = 'Ticker,Quantity\nGOOG,10\nMSFT,5';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
    ]);
  });

  it('handles Windows-style line endings', () => {
    const csv = 'GOOG,10\r\nMSFT,5\r\n';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
    ]);
  });

  it('uppercases tickers', () => {
    const csv = 'goog,10\nmsft,5';
    const result = parseCsvHoldings(csv);
    expect(result[0].ticker).toBe('GOOG');
    expect(result[1].ticker).toBe('MSFT');
  });

  it('skips blank lines', () => {
    const csv = 'GOOG,10\n\n\nMSFT,5\n';
    const result = parseCsvHoldings(csv);
    expect(result).toHaveLength(2);
  });

  it('skips rows with invalid quantity', () => {
    const csv = 'GOOG,abc\nMSFT,5';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'MSFT', quantity: 5 },
    ]);
  });

  it('skips rows with zero or negative quantity', () => {
    const csv = 'GOOG,0\nMSFT,-5\nAAPL,10';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'AAPL', quantity: 10 },
    ]);
  });

  it('skips rows with insufficient columns', () => {
    const csv = 'GOOG\nMSFT,5';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'MSFT', quantity: 5 },
    ]);
  });

  it('handles decimal quantities', () => {
    const csv = 'GOOG,10.5';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10.5 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseCsvHoldings('')).toEqual([]);
  });

  it('trims whitespace from tickers and quantities', () => {
    const csv = '  GOOG  ,  10  \n  MSFT  ,  5  ';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
    ]);
  });

  it('aggregates duplicate securities by adding quantities', () => {
    const csv = 'TEAM,100\nNET,60\nVB,15\nTEAM,200';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'TEAM', quantity: 300 },
      { ticker: 'NET', quantity: 60 },
      { ticker: 'VB', quantity: 15 },
    ]);
  });
});
