export interface SecurityTag {
  key: string;
  name: string;
  value: string;
}

/**
 * How the pipeline classified a constituent. Only "equity" constituents have a
 * resolvable security doc; "non-equity" (bonds, cash, futures) and
 * "unresolved" keep the raw provider string as their ticker. Docs written
 * before the pipeline recorded this have no kind.
 */
export type ConstituentKind = "equity" | "non-equity" | "unresolved";

export interface CompositeSecurity {
  ticker: string;
  isin: string | null;
  percentage: number;
  refreshedAt: string;
  kind?: ConstituentKind;
}

export interface SecurityDoc {
  ticker: string;
  isin: string | null;
  type: "stock" | "etf";
  price: number;
  tags: SecurityTag[];
  compositeSecurities: CompositeSecurity[];
  refreshedAt: string;
  updatedAt: string;
}

export interface SecurityResponse {
  ticker: string;
  isin: string | null;
  type: "stock" | "etf";
  price: number;
  tags: SecurityTag[];
  compositeSecurities: CompositeSecurity[];
  refreshedAt: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
