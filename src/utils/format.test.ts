import { describe, it, expect } from 'vitest';
import {
  formatPercentage,
  formatDollars,
  formatShares,
} from './format';

describe('formatPercentage', () => {
  it('formats a decimal as percentage', () => {
    expect(formatPercentage(0.5)).toBe('50.0%');
    expect(formatPercentage(0.733)).toBe('73.3%');
    expect(formatPercentage(1)).toBe('100.0%');
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('returns 0.0% for NaN', () => {
    expect(formatPercentage(NaN)).toBe('0.0%');
  });

  it('returns 0.0% for Infinity', () => {
    expect(formatPercentage(Infinity)).toBe('0.0%');
    expect(formatPercentage(-Infinity)).toBe('0.0%');
  });
});

describe('formatDollars', () => {
  it('formats cents as dollars', () => {
    expect(formatDollars(10000)).toBe('$100.00');
    expect(formatDollars(150)).toBe('$1.50');
    expect(formatDollars(0)).toBe('$0.00');
  });

  it('returns $0.00 for NaN', () => {
    expect(formatDollars(NaN)).toBe('$0.00');
  });

  it('returns $0.00 for Infinity', () => {
    expect(formatDollars(Infinity)).toBe('$0.00');
  });
});

describe('formatShares', () => {
  it('formats share count with 2 decimal places', () => {
    expect(formatShares(10)).toBe('10.00');
    expect(formatShares(3.333)).toBe('3.33');
    expect(formatShares(0)).toBe('0.00');
  });

  it('returns 0.00 for NaN', () => {
    expect(formatShares(NaN)).toBe('0.00');
  });

  it('returns 0.00 for Infinity', () => {
    expect(formatShares(Infinity)).toBe('0.00');
  });
});
