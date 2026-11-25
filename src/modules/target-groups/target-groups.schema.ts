import { z } from "zod";
import { idParam } from "@shared/schemas/id-param.js";

export const createTargetGroupSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do grupo alvo"),
});

export const updateTargetGroupSchema = z.object({
  id: idParam,
  data: z
    .object({
      name: z.string().trim().min(1, "Informe o nome do grupo alvo"),
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
