import { z } from "zod";

const INVALID_YEAR = "Ano inválido: use quatro dígitos, de 2000 a 2100";
const INVALID_MONTH = "Mês inválido: use um número de 1 a 12";

// Período dos indicadores: o ano inteiro ou um mês dele. Chega pela query string, por isso o coerce.
export const productionIndicatorsQuerySchema = z.object({
  year: z.coerce
    .number({ error: INVALID_YEAR })
    .int(INVALID_YEAR)
    .min(2000, INVALID_YEAR)
    .max(2100, INVALID_YEAR),
  month: z.coerce
    .number({ error: INVALID_MONTH })
    .int(INVALID_MONTH)
    .min(1, INVALID_MONTH)
    .max(12, INVALID_MONTH)
    .optional(),
});

export type IndicatorsPeriod = z.infer<typeof productionIndicatorsQuerySchema>;
