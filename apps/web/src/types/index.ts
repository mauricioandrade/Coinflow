// ── API response shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

// ── Monetary values ───────────────────────────────────────────────────────────
// The backend stores all monetary amounts as BigInt (cents).
// The frontend always works with `number` (cents) and formats on display.

/** Amount in cents (integer). Never use floating-point for monetary math. */
export type Cents = number;

/** Format cents to a locale-aware currency string. */
export function formatCurrency(cents: Cents, locale = "pt-BR", currency = "BRL"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parse a locale-aware currency string to cents (integer). */
export function parseCurrencyToCents(value: string): Cents {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const float = parseFloat(cleaned);
  if (isNaN(float)) return 0;
  return Math.round(float * 100);
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ── Shared entity fields ──────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
