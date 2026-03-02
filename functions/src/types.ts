export interface SecurityTag {
  key: string;
  name: string;
  value: string;
}

export interface CompositeSecurity {
  ticker: string;
  tags: SecurityTag[];
  price: number;
  percentage: number;
  refreshedAt: string;
}

export interface SecurityDoc {
  ticker: string;
  type: "stock" | "etf";
  price: number;
  tags: SecurityTag[];
  compositeSecurities: CompositeSecurity[];
  refreshedAt: string;
  updatedAt: string;
}

export interface SecurityResponse {
  ticker: string;
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
