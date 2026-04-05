import { z } from "zod";

/**
 * Transaction type enum — mirrors the Prisma TransactionType enum.
 */
export const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

/**
 * createTransactionSchema
 *
 * `amount` is collected from a currency-masked input and stored as an integer
 * (cents). The schema receives the raw cents value after mask processing —
 * never a float string.
 */
export const createTransactionSchema = z.object({
  description: z
    .string()
    .min(1, "Descrição obrigatória")
    .max(255, "Descrição muito longa")
    .trim(),

  // Amount in cents (integer). The currency mask component converts the
  // user's "R$ 1.234,56" input to 123456 before form submission.
  amountCents: z
    .number({ required_error: "Valor obrigatório" })
    .int("Valor deve ser um número inteiro (centavos)")
    .positive("Valor deve ser maior que zero")
    .max(999_999_999_99, "Valor excede o limite permitido"), // ~R$9.9 bi

  type: TransactionTypeEnum,

  date: z
    .string()
    .min(1, "Data obrigatória")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato esperado: YYYY-MM-DD)"),

  accountId: z.string().cuid("Conta inválida"),

  categoryId: z.string().cuid("Categoria inválida").optional(),

  notes: z.string().max(1000, "Observação muito longa").trim().optional(),
});

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;
