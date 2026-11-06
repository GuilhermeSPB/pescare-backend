import { z } from "zod";
import { idParam } from "@shared/schemas/id-param.js";
import { FISHING_ENVIRONMENTS } from "@shared/constants/fishing-environments.js";

// Valores aceitos pela constraint chk_fishing_ban_type da tabela fishing_ban: o ambiente do
// defeso, o mesmo vocabulário do tipo de local.
export const FISHING_BAN_TYPES = FISHING_ENVIRONMENTS;

export type FishingBanType = (typeof FISHING_BAN_TYPES)[number];

// Valores aceitos pela constraint chk_fishing_ban_period_status. DRAFT nao
// vale no app ate ser ativado.
export const FISHING_BAN_PERIOD_STATUSES = ["DRAFT", "ACTIVE"] as const;

export type FishingBanPeriodStatus = (typeof FISHING_BAN_PERIOD_STATUSES)[number];

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
// Um periodo pode ter varias janelas no mesmo ano (ex.: as cinco da andada
// do caranguejo-uca na Portaria SAP/MAPA no 325/2020).
const periodWindow = z.object({ start_date: monthDay, end_date: monthDay });
const windows = z
  .array(periodWindow)
  .min(1, "Informe ao menos uma janela do defeso")
  .refine(
    (list) => unique(list.map((window) => window.start_date.getTime())).length === list.length,
    { message: "Duas janelas não podem começar no mesmo dia" },
  );
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

// Tambem e o corpo de uma nova versao (POST /:id/versions).
export const createFishingBanPeriodSchema = z.object({
  rule,
  fishing_ban_type: fishingBanType,
  windows,
  status: z.enum(FISHING_BAN_PERIOD_STATUSES).default("ACTIVE"),
  start_in: isoDate,
  valid_until: isoDate.nullable().optional(),
  observation: observation.optional(),
  applies_to_all_species: z.boolean().default(false),
  species_ids: ids.default([]),
  applies_to_all_location_types: z.boolean().default(false),
  location_type_ids: ids.default([]),
  municipalities,
});

// Corrige a versao no lugar. O status nao muda por aqui: ativar tem rota
// propria, porque encerra a versao anterior.
export const updateFishingBanPeriodSchema = z
  .object({
    rule: rule.optional(),
    fishing_ban_type: fishingBanType.optional(),
    windows: windows.optional(),
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

// Query da listagem de defesos da cidade: o IBGE do município e o dia (o do aparelho, para
// "hoje" bater com o dia do pescador).
export const municipalityQuerySchema = z.object({
  municipality: ibgeCode,
  date: isoDate,
});

export type CreateFishingBanPeriodType = z.infer<typeof createFishingBanPeriodSchema>;
export type UpdateFishingBanPeriodType = z.infer<typeof updateFishingBanPeriodSchema>;
export type InEffectQueryType = z.infer<typeof inEffectQuerySchema>;
export type FishingBanPeriodWindowType = z.infer<typeof periodWindow>;
// A norma do periodo: texto da portaria e ambiente, sempre juntos no upsert.
export type FishingBanNormType = Pick<CreateFishingBanPeriodType, "rule" | "fishing_ban_type">;
// Campos do PUT sem a norma (o service completa a norma a parte).
export type UpdateFishingBanPeriodFields = Omit<
  UpdateFishingBanPeriodType,
  "rule" | "fishing_ban_type"
>;
