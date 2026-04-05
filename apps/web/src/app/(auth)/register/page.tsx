import type { Metadata } from "next";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Criar sua conta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comece a controlar suas finanças hoje
        </p>
      </div>
      {/* RegisterForm will be added in Phase 2 */}
    </div>
  );
}
