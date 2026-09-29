import { z } from "zod";

export const createTargetGroupSchema = z.object({
  name: z.string().min(1, "Informe o nome do grupo alvo").trim(),
});

export const updateTargetGroupSchema = z.object({
  id: z.number().int(),
  data: z
    .object({
      name: z.string().min(1, "Informe o nome do grupo alvo").trim(),
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

export type CreateTargetGroupType = z.infer<typeof createTargetGroupSchema>;
export type UpdateTargetGroupType = z.infer<typeof updateTargetGroupSchema>;
