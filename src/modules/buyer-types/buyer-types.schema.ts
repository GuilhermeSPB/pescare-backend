import { z } from "zod";

export const createBuyerTypeSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo de comprador").trim(),
});

export const updateBuyerTypeSchema = z.object({
  id: z.number().int(),
  data: z
    .object({
      name: z.string().min(1, "Informe o nome do tipo de comprador").trim(),
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

export type CreateBuyerTypeType = z.infer<typeof createBuyerTypeSchema>;
export type UpdateBuyerTypeType = z.infer<typeof updateBuyerTypeSchema>;
