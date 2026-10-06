import { z } from "zod";

export const createLocationFishingSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo de local de pesca").trim(),
});

export const updateLocationFishingSchema = z.object({
  id: z.number().int(),
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

export type CreateLocationFishingType = z.infer<
  typeof createLocationFishingSchema
>;
export type UpdateLocationFishingType = z.infer<
  typeof updateLocationFishingSchema
>;
