import { z } from "zod";
import { idParam } from "@shared/schemas/id-param.js";

// Valores aceitos pela constraint chk_fishing_ban_type da tabela fishing_ban.
export const FISHING_BAN_TYPES = ["CONTINENTAL", "MARINHO"] as const;

export type FishingBanType = (typeof FISHING_BAN_TYPES)[number];

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

// A norma e so o texto da portaria (ex.: "Portaria IBAMA Nº 48/07").
const rule = z.string().trim().min(1, "Informe a portaria do defeso");
const fishingBanType = z.enum(FISHING_BAN_TYPES);
// Janela anual recorrente em MM-DD. Valida no ano 2000, o mesmo ano de
// referencia gravado no banco: por ser bissexto, 02-29 vale e 02-30 nao.
const monthDay = z
  .string()
  .transform((value) => `2000-${value}`)
  .pipe(z.iso.date("Informe dia e mês válidos no formato MM-DD"))
  .transform((value) => new Date(`${value}T00:00:00Z`));
// Data no formato AAAA-MM-DD (coluna DATE).
const isoDate = z.iso
  .date("Informe a data no formato AAAA-MM-DD")
  .transform((value) => new Date(value));
const observation = z.string().trim().nullable();
const id = z.number({ error: "ID inválido" }).int("ID inválido").positive("ID inválido");
const ids = z.array(id).transform(unique);
const ibgeCode = z.string().regex(/^[0-9]{7}$/, "Código IBGE do município inválido");
const municipalities = z
  .array(ibgeCode)
  .min(1, "Informe ao menos um município")
  .transform(unique);

export const createFishingBanPeriodSchema = z.object({
  rule,
  fishing_ban_type: fishingBanType,
  start_date: monthDay,
  end_date: monthDay,
  start_in: isoDate,
  valid_until: isoDate.nullable().optional(),
  observation: observation.optional(),
  applies_to_all_species: z.boolean().default(false),
  species_ids: ids.default([]),
  applies_to_all_location_types: z.boolean().default(false),
  location_type_ids: ids.default([]),
  municipalities,
});

export const updateFishingBanPeriodSchema = z
  .object({
    rule: rule.optional(),
    fishing_ban_type: fishingBanType.optional(),
    start_date: monthDay.optional(),
    end_date: monthDay.optional(),
    start_in: isoDate.optional(),
    valid_until: isoDate.nullable().optional(),
    observation: observation.optional(),
    applies_to_all_species: z.boolean().optional(),
    species_ids: ids.optional(),
    applies_to_all_location_types: z.boolean().optional(),
    location_type_ids: ids.optional(),
    municipalities: municipalities.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar",
  });

// Query do passo "Espécie em defeso?" do registro de pesca. speciesIds
// chega como texto separado por virgula (ex.: "1,2").
export const inEffectQuerySchema = z.object({
  date: isoDate,
  municipality: ibgeCode,
  typeLocationId: idParam,
  speciesIds: z
    .string({ error: "Informe as espécies" })
    .transform((value) => value.split(",").map((part) => Number(part.trim())))
    .pipe(z.array(id))
    .transform(unique),
});

export type CreateFishingBanPeriodType = z.infer<typeof createFishingBanPeriodSchema>;
export type UpdateFishingBanPeriodType = z.infer<typeof updateFishingBanPeriodSchema>;
export type InEffectQueryType = z.infer<typeof inEffectQuerySchema>;
// A norma do periodo: texto da portaria e ambiente, sempre juntos no upsert.
export type FishingBanNormType = Pick<CreateFishingBanPeriodType, "rule" | "fishing_ban_type">;
// Campos do PUT sem a norma (o service completa a norma a parte).
export type UpdateFishingBanPeriodFields = Omit<
  UpdateFishingBanPeriodType,
  "rule" | "fishing_ban_type"
>;
