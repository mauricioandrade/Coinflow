"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, type LoginFormValues } from "../schemas";
import { useLogin } from "../hooks/use-login";
import { getErrorMessage } from "@/lib/api/types";

export function LoginForm() {
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await login.mutateAsync(values);
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Entrar no Coinflow</CardTitle>
      </CardHeader>

      <CardContent>
        <form
          id="login-form"
          onSubmit={onSubmit}
          noValidate
          aria-label="Formulário de login"
          className="space-y-4"
        >
          {/* Global API error */}
          {login.isError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {getErrorMessage(login.error)}
            </div>
          )}

          <FormField
            id="email"
            label="E-mail"
            error={errors.email?.message}
            required
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="voce@exemplo.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
          </FormField>

          <FormField
            id="password"
            label="Senha"
            error={errors.password?.message}
            required
          >
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
          </FormField>

          <Button
            type="submit"
            form="login-form"
            className="w-full"
            disabled={isSubmitting || login.isPending}
            aria-busy={isSubmitting || login.isPending}
          >
            {login.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center text-sm text-muted-foreground">
        Não tem uma conta?&nbsp;
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Criar conta
        </Link>
      </CardFooter>
    </Card>
  );
}
