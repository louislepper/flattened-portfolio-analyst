export interface SecurityTag {
  key: string;
  name: string;
  value: string;
}

export interface CompositeSecurity {
  ticker: string;
  isin: string | null;
  percentage: number;
  refreshedAt: string;
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
