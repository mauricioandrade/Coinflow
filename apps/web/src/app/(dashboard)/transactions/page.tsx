import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Transações" };

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded bg-muted" />}>
        {/* TransactionList — Phase 2 */}
      </Suspense>
    </div>
  );
}
