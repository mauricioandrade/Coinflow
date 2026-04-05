import type { ReactNode } from "react";
import { Suspense } from "react";

/**
 * Dashboard shell layout.
 * Sidebar + top nav will be implemented in Phase 2.
 * Suspense boundary at this level enables partial rendering:
 * the shell appears instantly while data-fetching pages stream in.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar placeholder — Phase 2 */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r bg-card" />

      <div className="flex flex-1 flex-col">
        {/* Top nav placeholder — Phase 2 */}
        <header className="h-14 border-b bg-card shrink-0" />

        <main className="flex-1 p-6 overflow-auto">
          <Suspense
            fallback={
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-1/3 rounded bg-muted" />
                <div className="h-48 rounded bg-muted" />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
