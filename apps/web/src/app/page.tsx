import { redirect } from "next/navigation";

/**
 * Root page — immediately redirects to the dashboard.
 * Auth middleware (Phase 2) will intercept unauthenticated users
 * and redirect them to /login before they ever reach /(dashboard).
 */
export default function RootPage() {
  redirect("/login");
}
