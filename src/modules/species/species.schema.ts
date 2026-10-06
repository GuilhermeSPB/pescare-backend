import { z } from "zod";

export const createSpeciesSchema = z.object({
  scientific_name: z
    .string()
    .min(1, "Informe o nome científico da espécie")
    .trim(),
  main_name: z.string().min(1, "Informe o nome principal da espécie").trim(),
  description: z.string().trim().optional(),
  target_group_id: z.number().int(),
});

export const updateSpeciesSchema = z.object({
  id: z.number().int(),
  data: z
    .object({
      scientific_name: z
        .string()
        .min(1, "Informe o nome científico da espécie")
        .trim(),
      main_name: z
        .string()
        .min(1, "Informe o nome principal da espécie")
        .trim(),
      description: z.string().trim(),
      target_group_id: z.number().int(),
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

export type CreateSpeciesType = z.infer<typeof createSpeciesSchema>;
export type UpdateSpeciesType = z.infer<typeof updateSpeciesSchema>;
