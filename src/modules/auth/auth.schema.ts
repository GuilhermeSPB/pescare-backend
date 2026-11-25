import { z } from "zod";
import { emailSchema } from "@shared/schemas/email.js";

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  email: emailSchema,
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
  fk_municipality_ibge_code: z
    .string()
    .length(7, "Código IBGE do município inválido"),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
});

export type SignUpType = z.infer<typeof signUpSchema>;
export type SignInType = z.infer<typeof signInSchema>;
