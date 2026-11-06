import { z } from "zod";
import { idParam } from "@shared/schemas/id-param.js";
import { FISHING_ENVIRONMENTS } from "@shared/constants/fishing-environments.js";

// Ambiente de pesca do REAP. Opcional: o painel ainda cadastra tipos só com o nome.
const environment = z.enum(FISHING_ENVIRONMENTS, { error: "Ambiente de pesca inválido" });

export const createFishingLocationTypeSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo de local de pesca").trim(),
  // Sem o campo, grava nulo: com exactOptionalPropertyTypes, o Prisma não aceita `undefined`.
  environment: environment.nullable().default(null),
});

export const updateFishingLocationTypeSchema = z.object({
  id: idParam,
  data: z
    .object({
      name: z
        .string()
        .min(1, "Informe o nome do tipo de local de pesca")
        .trim(),
      is_active: z.boolean(),
      environment,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Informe ao menos um campo para atualizar",
    })
    .transform((data) =>
      Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      ),
    ),
});

export type CreateFishingLocationTypeType = z.infer<
  typeof createFishingLocationTypeSchema
>;
export type UpdateFishingLocationTypeType = z.infer<
  typeof updateFishingLocationTypeSchema
>;
