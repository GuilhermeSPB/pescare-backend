import { z } from "zod";
import { idParam } from "@shared/schemas/id-param.js";

export const createFishingLocationTypeSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo de local de pesca").trim(),
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
