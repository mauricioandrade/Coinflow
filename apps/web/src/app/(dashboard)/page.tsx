import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard home — summary cards and charts.
 * Data fetching via TanStack Query will be wired in Phase 2.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      {/* Summary cards, charts — Phase 2 */}
    </div>
  );
}
