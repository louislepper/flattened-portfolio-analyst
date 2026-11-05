export interface SecurityTag {
  readonly key: string;
  readonly name: string;
  readonly value: string;
}

/**
 * How the data pipeline classified an ETF constituent. Only `equity`
 * constituents have a security doc to look up; `non-equity` (bonds, cash,
 * futures) and `unresolved` keep the provider's raw string as `ticker`, which
 * can collide with an unrelated security (US Treasuries as `T`). Absent on
 * docs written before the pipeline recorded it.
 */
export type ConstituentKind = 'equity' | 'non-equity' | 'unresolved';

export interface CompositeSecurity {
  readonly ticker: string;
  readonly isin: string | null;
  readonly percentage: number;
  readonly refreshedAt: string;
  readonly kind?: ConstituentKind;
}

export type SecurityType = 'stock' | 'etf';

export interface SecurityResponse {
  readonly ticker: string;
  readonly isin: string | null;
  readonly type: SecurityType;
  readonly tags: readonly SecurityTag[];
  readonly price: number;
  readonly compositeSecurities: readonly CompositeSecurity[];
  readonly refreshedAt: string;
}

export interface ErrorResponse {
  readonly error: string;
  readonly message: string;
}
