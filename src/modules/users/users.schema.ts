import { z } from "zod";
import { ROLES } from "@shared/constants/roles.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

const name = z.string().trim().min(1, "Informe o nome");
const ibgeCode = z.string().length(7, "Código IBGE do município inválido");
const password = z.string().min(8, "A senha deve ter no mínimo 8 caracteres");

const atLeastOneField = (data: object) =>
  Object.values(data).some((value) => value !== undefined);
const atLeastOneFieldMessage = "Informe ao menos um campo para atualizar";

export const updateMeSchema = z
  .object({
    name: name.optional(),
    fk_municipality_ibge_code: ibgeCode.optional(),
  })
  .refine(atLeastOneField, atLeastOneFieldMessage);

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Informe a senha atual"),
    new_password: password,
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "A nova senha deve ser diferente da atual",
    path: ["new_password"],
  });

export const listUsersSchema = z.object({
  isActive: booleanQueryParam,
  role: z.enum(ROLES).optional(),
});

// Cadastro feito por um admin: diferente do sign-up publico, permite
// escolher a role (ex.: criar outro ADMIN).
export const createUserSchema = z.object({
  name,
  email: z.email("Informe um e-mail válido").trim().toLowerCase(),
  password,
  fk_municipality_ibge_code: ibgeCode,
  role: z.enum(ROLES),
});

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(atLeastOneField, atLeastOneFieldMessage);

export type UpdateMeType = z.infer<typeof updateMeSchema>;
export type ListUsersType = z.infer<typeof listUsersSchema>;
export type CreateUserType = z.infer<typeof createUserSchema>;
export type AdminUpdateUserType = z.infer<typeof adminUpdateUserSchema>;
