import { z } from "zod";

export const createFishingMethodSchema = z.object({
  name: z.string().min(1, "Informe o nome do método de pesca").trim(),
});

export const updateFishingMethodSchema = z.object({
  id: z.number().int(),
  data: z
    .object({
      name: z.string().min(1, "Informe o nome do método de pesca").trim(),
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

export type CreateFishingMethodType = z.infer<
  typeof createFishingMethodSchema
>;
export type UpdateFishingMethodType = z.infer<
  typeof updateFishingMethodSchema
>;
