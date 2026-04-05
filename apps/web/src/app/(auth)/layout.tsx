import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s | Coinflow",
    default: "Autenticação | Coinflow",
  },
};

/**
 * Auth layout — centers the form on screen.
 * No sidebar / navigation: unauthenticated users see only the auth UI.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      {children}
    </main>
  );
}
