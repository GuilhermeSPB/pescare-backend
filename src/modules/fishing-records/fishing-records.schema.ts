import { z } from "zod";
import { idParam } from "@shared/schemas/id-param.js";

// Valores aceitos pela constraint chk_fishing_record_status. "Em andamento" é a pesca que o
// pescador deixa para completar depois.
export const FISHING_RECORD_STATUSES = ["EM_ANDAMENTO", "FINALIZADO"] as const;

export type FishingRecordStatus = (typeof FISHING_RECORD_STATUSES)[number];

// Valores aceitos pela constraint chk_unit_measure. Provisórios no banco ("ajustar valores reais").
export const CATCH_UNITS = ["KG", "UNIDADE"] as const;

export type CatchUnit = (typeof CATCH_UNITS)[number];

// Data "AAAA-MM-DD" válida de verdade (2026-02-30 é recusado).
const isoDate = z.iso.date("Informe a data no formato AAAA-MM-DD");

const positiveNumber = (message: string) =>
  z.number({ error: message }).positive(message);

function hasUniqueValues(values: number[]) {
  return new Set(values).size === values.length;
}

const catchSchema = z.object({
  fk_species_id: idParam,
  quantity: positiveNumber("Informe a quantidade capturada"),
  unit_measure: z.enum(CATCH_UNITS, { error: "Unidade inválida" }),
  // Opcional: o pescador não precisa informar o preço de cada espécie.
  unit_value: z.number({ error: "Valor unitário inválido" }).nonnegative("Valor unitário inválido").optional(),
  commercialized: z.boolean(),
});

const commercializationSchema = z.object({
  commercialization_date: isoDate,
  total_value: positiveNumber("Informe o valor total vendido"),
  buyer_type_ids: z
    .array(idParam)
    .min(1, "Escolha pelo menos um tipo de comprador")
    .refine(hasUniqueValues, "Tipo de comprador repetido"),
});

export const createFishingRecordSchema = z
  .object({
    fishing_date: isoDate,
    fk_municipality_ibge_code: z.string().regex(/^[0-9]{7}$/, "Código IBGE do município inválido"),
    fk_type_location_id: idParam,
    fk_fishing_method_id: idParam,
    // Nome do lugar (REAP: "Nome do local"). Obrigatório em pescas novas; as antigas ficam sem.
    location_name: z
      .string({ error: "Informe o nome do lugar onde pescou" })
      .trim()
      .min(1, "Informe o nome do lugar onde pescou")
      .max(120, "O nome do lugar pode ter até 120 letras"),
    status: z.enum(FISHING_RECORD_STATUSES, { error: "Situação inválida" }),
    species: z
      .array(catchSchema)
      .min(1, "Informe ao menos uma espécie")
      .refine(
        (items) => hasUniqueValues(items.map((item) => item.fk_species_id)),
        "A mesma espécie aparece mais de uma vez",
      ),
    commercialization: commercializationSchema.nullish(),
  })
  .refine(
    (data) =>
      !data.species.some((item) => item.commercialized) || Boolean(data.commercialization),
    { message: "Informe a venda das espécies vendidas", path: ["commercialization"] },
  )
  .refine(
    (data) => !data.commercialization || data.species.some((item) => item.commercialized),
    { message: "Nenhuma espécie foi marcada como vendida", path: ["commercialization"] },
  );

export const listFishingRecordsQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export const updateFishingRecordSchema = z.object({
  id: idParam,
  data: z.object({
    status: z.enum(FISHING_RECORD_STATUSES, { error: "Situação inválida" }),
  }),
});

export type CreateFishingRecordType = z.infer<typeof createFishingRecordSchema>;
export type ListFishingRecordsQueryType = z.infer<typeof listFishingRecordsQuerySchema>;
export type UpdateFishingRecordType = z.infer<typeof updateFishingRecordSchema>;
