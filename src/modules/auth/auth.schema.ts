import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, "Informe o nome").trim(),
  email: z.email("Informe um e-mail válido").trim().toLowerCase(),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
  fk_municipality_ibge_code: z
    .string()
    .length(7, "Código IBGE do município inválido"),
});

export const signInSchema = z.object({
  email: z.email("Informe um e-mail válido").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha"),
});

export type SignUpType = z.infer<typeof signUpSchema>;
export type SignInType = z.infer<typeof signInSchema>;
