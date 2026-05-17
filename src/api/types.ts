export interface SecurityTag {
  readonly key: string;
  readonly name: string;
  readonly value: string;
}

export interface CompositeSecurity {
  readonly ticker: string;
  readonly isin: string | null;
  readonly percentage: number;
  readonly refreshedAt: string;
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
