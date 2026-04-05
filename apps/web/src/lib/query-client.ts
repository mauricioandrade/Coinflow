import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";
import type { ApiError } from "@/types";

// ── Stale times by data category ─────────────────────────────────────────────
// Financial data has different staleness characteristics:
//   - Account balances / summaries: 5 minutes (user expects near-real-time)
//   - Transaction lists: 2 minutes (frequently mutated)
//   - Categories / labels: 30 minutes (rarely changes)
//   - Static reference (currencies, supported banks): Infinity (never changes)

export const STALE_TIMES = {
  /** Near-real-time: account balances, dashboard summaries */
  realtime: 1 * 60 * 1000,
  /** Default for most financial data (transactions, budgets, goals) */
  default: 2 * 60 * 1000,
  /** User-defined reference data that changes rarely */
  reference: 30 * 60 * 1000,
  /** Truly static: supported banks, currencies */
  static: Infinity,
} as const;

// ── Retry policy ─────────────────────────────────────────────────────────────
// Do NOT retry on auth errors (401/403) — retrying would be pointless and
// would hammer the server. Retry up to 2 times for transient server errors.

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const err = error as Partial<ApiError>;
  const status = err.statusCode;
  if (status === 401 || status === 403 || status === 404 || status === 422) {
    return false;
  }
  return true;
}

// ── Query client factory ──────────────────────────────────────────────────────
// Exported as a factory so tests can create isolated instances.

export function makeQueryClient(overrides: Partial<QueryClientConfig> = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.default,
        gcTime: 10 * 60 * 1000, // keep unused data in cache for 10 min
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Never refetch on mount when data is fresh — avoids waterfall on navigation
        refetchOnMount: true,
      },
      mutations: {
        retry: false,
      },
    },
    ...overrides,
  });
}

// ── Browser singleton ─────────────────────────────────────────────────────────
// A single QueryClient instance is shared across the entire browser session.
// RSC / server components get their own fresh instance per request (see
// providers/query-provider.tsx).

let browserClient: QueryClient | undefined;

export function getBrowserQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server-side: always a new instance to avoid cross-request contamination
    return makeQueryClient();
  }
  browserClient ??= makeQueryClient();
  return browserClient;
}
