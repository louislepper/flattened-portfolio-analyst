export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDollars(cents: number): string {
  if (!Number.isFinite(cents)) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatShares(shares: number): string {
  if (!Number.isFinite(shares)) return '0.00';
  return shares.toFixed(2);
}
