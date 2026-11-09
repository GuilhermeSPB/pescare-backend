import { z } from "zod";

// GLOBAL: vale para todos os municipios. MUNICIPAL: so para os municipios
// listados em alert_coverage.
export const ALERT_SCOPES = ["GLOBAL", "MUNICIPAL"] as const;
export const ALERT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type AlertScope = (typeof ALERT_SCOPES)[number];

const title = z.string().trim().min(1, "Informe o título do comunicado");
const description = z.string().trim().min(1, "Informe o texto do comunicado");
const scope = z.enum(ALERT_SCOPES);
const status = z.enum(ALERT_STATUSES);
const municipalities = z
  .array(z.string().regex(/^[0-9]{7}$/, "Código IBGE do município inválido"))
  .transform((codes) => [...new Set(codes)]);

// A data de publicacao nao entra aqui: quem define e a API, ao publicar.
export const createAlertSchema = z.object({
  title,
  description,
  scope,
  status: status.default("DRAFT"),
  municipalities: municipalities.default([]),
});

export const updateAlertSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    scope: scope.optional(),
    status: status.optional(),
    municipalities: municipalities.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar",
  });

export const listAlertsSchema = z.object({
  scope: scope.optional(),
  status: status.optional(),
});

export type CreateAlertType = z.infer<typeof createAlertSchema>;
export type UpdateAlertType = z.infer<typeof updateAlertSchema>;
export type ListAlertsType = z.infer<typeof listAlertsSchema>;
