import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail obrigatório")
    .email("E-mail inválido")
    .max(254, "E-mail muito longo")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "Senha obrigatória")
    .max(128, "Senha muito longa"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nome deve ter no mínimo 2 caracteres")
      .max(100, "Nome muito longo")
      .trim(),
    email: z
      .string()
      .min(1, "E-mail obrigatório")
      .email("E-mail inválido")
      .max(254)
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .max(128, "Senha muito longa")
      .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter pelo menos um número"),
    confirmPassword: z.string().min(1, "Confirmação de senha obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
