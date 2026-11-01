import { z } from "zod";

// O banco nao tem constraint para esses campos, entao os valores aceitos
// sao definidos aqui. Os tipos espelham as colunas de alert_preference.
export const ALERT_TYPES = ["FISHING_BAN", "NEWS", "EVENT", "SYSTEM"] as const;
// GLOBAL: vale para todos os municipios. MUNICIPAL: so para os municipios
// listados em alert_coverage.
export const ALERT_SCOPES = ["GLOBAL", "MUNICIPAL"] as const;
export const ALERT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type AlertScope = (typeof ALERT_SCOPES)[number];

const title = z.string().trim().min(1, "Informe o título do alerta");
const description = z.string().trim().nullable();
const alertType = z.enum(ALERT_TYPES);
const scope = z.enum(ALERT_SCOPES);
const status = z.enum(ALERT_STATUSES);
// Data no formato YYYY-MM-DD (coluna DATE).
const publicationDate = z.iso
  .date("Informe a data no formato AAAA-MM-DD")
  .transform((value) => new Date(value));
const municipalities = z
  .array(z.string().regex(/^[0-9]{7}$/, "Código IBGE do município inválido"))
  .transform((codes) => [...new Set(codes)]);

export const createAlertSchema = z.object({
  title,
  description: description.optional(),
  alert_type: alertType,
  scope,
  status: status.default("DRAFT"),
  publication_date: publicationDate.optional(),
  municipalities: municipalities.default([]),
});

export const updateAlertSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    alert_type: alertType.optional(),
    scope: scope.optional(),
    status: status.optional(),
    publication_date: publicationDate.optional(),
    municipalities: municipalities.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar",
  });

export const listAlertsSchema = z.object({
  alert_type: alertType.optional(),
  scope: scope.optional(),
  status: status.optional(),
});

export const updatePreferencesSchema = z
  .object({
    fishing_ban_alert: z.boolean().optional(),
    news_alert: z.boolean().optional(),
    event_alert: z.boolean().optional(),
    system_alert: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos uma preferência para atualizar",
  });

export type CreateAlertType = z.infer<typeof createAlertSchema>;
export type UpdateAlertType = z.infer<typeof updateAlertSchema>;
export type ListAlertsType = z.infer<typeof listAlertsSchema>;
export type UpdatePreferencesType = z.infer<typeof updatePreferencesSchema>;
