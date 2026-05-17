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

  it('parses optional price column and converts USD to cents', () => {
    const csv = 'GOOG,10,150.50\nMSFT,5,300';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10, overridePrice: 15050 },
      { ticker: 'MSFT', quantity: 5, overridePrice: 30000 },
    ]);
  });

  it('omits overridePrice when price column is absent', () => {
    const csv = 'GOOG,10\nMSFT,5,300';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5, overridePrice: 30000 },
    ]);
  });

  it('ignores invalid price values', () => {
    const csv = 'GOOG,10,abc\nMSFT,5,0\nAAPL,3,-5';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10 },
      { ticker: 'MSFT', quantity: 5 },
      { ticker: 'AAPL', quantity: 3 },
    ]);
  });

  it('uses last specified price for duplicate tickers', () => {
    const csv = 'GOOG,10,100\nGOOG,5,200';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 15, overridePrice: 20000 },
    ]);
  });

  it('auto-detects header when price column header is present', () => {
    const csv = 'Ticker,Quantity,Price\nGOOG,10,150';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10, overridePrice: 15000 },
    ]);
  });

  it('handles quoted fields containing commas', () => {
    const csv = 'Symbol,Quantity,Price,Value\nAMZN,239,264.14,"$63,129.46"';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'AMZN', quantity: 239, overridePrice: 26414 },
    ]);
  });

  it('handles quoted quantity containing commas', () => {
    const csv = 'USD_CASH,"101,500.00",1,101500';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'USD_CASH', quantity: 101500, overridePrice: 100 },
    ]);
  });

  it('strips dollar signs from numeric fields', () => {
    const csv = 'GOOG,10,$150.50';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'GOOG', quantity: 10, overridePrice: 15050 },
    ]);
  });

  it('skips rows with empty ticker', () => {
    const csv = 'Symbol,Quantity,Price,Value\nAMZN,10,100,"$1,000"\n,,,\n,,,"$5,000"';
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'AMZN', quantity: 10, overridePrice: 10000 },
    ]);
  });

  it('handles a realistic multi-column export with quoted values', () => {
    const csv = [
      'Symbol,Quantity,Price,Value',
      'AMZN,239,264.14,"$63,129.46"',
      'TEAM,343,87.46,"$29,998.78"',
      'USD_CASH,"101,500.00",1,101500',
    ].join('\n');
    const result = parseCsvHoldings(csv);
    expect(result).toEqual([
      { ticker: 'AMZN', quantity: 239, overridePrice: 26414 },
      { ticker: 'TEAM', quantity: 343, overridePrice: 8746 },
      { ticker: 'USD_CASH', quantity: 101500, overridePrice: 100 },
    ]);
  });
});
