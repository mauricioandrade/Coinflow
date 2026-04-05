"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { makeQueryClient } from "@/lib/query-client";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Wraps the app with QueryClientProvider.
 *
 * Uses useState so each component tree gets its own isolated QueryClient
 * on the server (avoids cross-request data leakage in RSC streaming).
 * On the browser, the instance is stable for the lifetime of the component.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // useState with initializer guarantees a single instance per component tree,
  // which is correct both in RSC (new per request) and client hydration (stable).
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools are tree-shaken from production builds automatically */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
