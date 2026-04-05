"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import { CurrencyInput } from "@/components/forms/currency-input";
import {
  createTransactionSchema,
  type CreateTransactionFormValues,
} from "../schemas";

interface TransactionFormProps {
  accountId: string;
  onSuccess?: () => void;
}

/**
 * TransactionForm — creates a new transaction.
 *
 * Security highlights:
 *  - Amount is collected via CurrencyInput → stored as integer cents.
 *    No floating-point arithmetic anywhere in the form.
 *  - All string inputs are trimmed by the Zod schema on submission.
 *  - react-hook-form controls all inputs — no dangerouslySetInnerHTML.
 *  - noValidate prevents browser validation from leaking internal types.
 */
export function TransactionForm({ accountId, onSuccess }: TransactionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      accountId,
      amountCents: 0,
      type: "EXPENSE",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    // TODO (Phase 2 wiring): call transactionService.create(values)
    // The form already sends amountCents (integer) — no float conversion needed.
     
    console.debug("[TransactionForm] submit payload:", values);
    reset();
    onSuccess?.();
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Nova transação"
      className="space-y-4"
    >
      <FormField
        id="description"
        label="Descrição"
        error={errors.description?.message}
        required
      >
        <Input
          id="description"
          type="text"
          autoComplete="off"
          placeholder="Ex: Aluguel, Salário, Mercado…"
          aria-invalid={!!errors.description}
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
          {...register("description")}
        />
      </FormField>

      <FormField
        id="amountCents"
        label="Valor"
        error={errors.amountCents?.message}
        hint="Digite o valor em reais"
        required
      >
        <Controller
          name="amountCents"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              id="amountCents"
              valueCents={field.value}
              onValueChange={field.onChange}
              aria-invalid={!!errors.amountCents}
              aria-describedby={
                errors.amountCents
                  ? "amountCents-error"
                  : "amountCents-hint"
              }
            />
          )}
        />
      </FormField>

      <FormField id="type" label="Tipo" error={errors.type?.message} required>
        <select
          id="type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-invalid={!!errors.type}
          {...register("type")}
        >
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
          <option value="TRANSFER">Transferência</option>
        </select>
      </FormField>

      <FormField id="date" label="Data" error={errors.date?.message} required>
        <Input
          id="date"
          type="date"
          aria-invalid={!!errors.date}
          {...register("date")}
        />
      </FormField>

      <FormField
        id="notes"
        label="Observação"
        error={errors.notes?.message}
        hint="Opcional"
      >
        <Input
          id="notes"
          type="text"
          autoComplete="off"
          placeholder="Detalhes adicionais…"
          {...register("notes")}
        />
      </FormField>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Salvando…" : "Salvar transação"}
      </Button>
    </form>
  );
}
