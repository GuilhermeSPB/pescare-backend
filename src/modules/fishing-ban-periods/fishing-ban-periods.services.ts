import { AppError } from "@shared/errors/app-error.js";
import { idParam } from "@shared/schemas/id-param.js";
import { toIsoDate, toMonthDay } from "@shared/utils/dates.js";
import { fishingBanPeriodsRepository } from "./fishing-ban-periods.repository.js";
import {
  createFishingBanPeriodSchema,
  inEffectQuerySchema,
  updateFishingBanPeriodSchema,
  type FishingBanNormType,
  type FishingBanType,
  type UpdateFishingBanPeriodFields,
} from "./fishing-ban-periods.schema.js";

type PeriodListRow = Awaited<
  ReturnType<typeof fishingBanPeriodsRepository.getAll>
>[number];
type PeriodDetailRow = NonNullable<
  Awaited<ReturnType<typeof fishingBanPeriodsRepository.getById>>
>;
type PeriodBaseRow = Omit<PeriodDetailRow, "fishing_ban_coverage">;
type PeriodCurrentState = NonNullable<
  Awaited<ReturnType<typeof fishingBanPeriodsRepository.getForUpdate>>
>;
type InEffectCandidate = Awaited<
  ReturnType<typeof fishingBanPeriodsRepository.getInEffectCandidates>
>[number];

interface FishingBanText {
  name: string;
  rule: string | null;
}

const NOT_FOUND_MESSAGE = "Período de defeso não encontrado";
const SPECIES_SCOPE_MESSAGE =
  "Informe ao menos uma espécie ou marque todas as espécies";
const LOCATION_TYPES_SCOPE_MESSAGE =
  "Informe ao menos um tipo de local ou marque todos os tipos de local";

// Normas criadas fora da API podem ter `rule` vazio; `name` guarda o mesmo
// texto nas criadas por aqui.
function ruleText(fishingBan: FishingBanText) {
  return fishingBan.rule ?? fishingBan.name;
}

function toBaseResponse({
  fishing_ban,
  fishing_ban_species,
  fishing_ban_type_location,
  start_date,
  end_date,
  start_in,
  valid_until,
  ...period
}: PeriodBaseRow) {
  return {
    ...period,
    fishing_ban: {
      id: fishing_ban.id,
      rule: ruleText(fishing_ban),
      fishing_ban_type: fishing_ban.fishing_ban_type,
    },
    start_date: toMonthDay(start_date),
    end_date: toMonthDay(end_date),
    start_in: toIsoDate(start_in),
    valid_until: valid_until === null ? null : toIsoDate(valid_until),
    species: fishing_ban_species.map((link) => link.species),
    location_types: fishing_ban_type_location.map((link) => link.type_location),
  };
}

function toListResponse({ fishing_ban_coverage, ...period }: PeriodListRow) {
  const ufs = fishing_ban_coverage.map((coverage) => coverage.municipality.uf);

  return {
    ...toBaseResponse(period),
    municipality_count: fishing_ban_coverage.length,
    ufs: [...new Set(ufs)].sort(),
  };
}

function toDetailResponse({ fishing_ban_coverage, ...period }: PeriodDetailRow) {
  return {
    ...toBaseResponse(period),
    municipalities: fishing_ban_coverage.map((coverage) => coverage.municipality),
  };
}

// Com "todas" marcado a lista fica vazia; sem ele, precisa de ao menos um
// item.
function resolveScope(appliesToAll: boolean, ids: number[], message: string) {
  if (appliesToAll) {
    return [];
  }

  if (ids.length === 0) {
    throw new AppError(message, 400);
  }

  return ids;
}

// No PUT, so recalcula a lista quando a flag ou a lista vieram. O que nao
// veio e completado com o estado atual.
function mergeScope(
  sentAppliesToAll: boolean | undefined,
  sentIds: number[] | undefined,
  current: { appliesToAll: boolean; ids: number[] },
  message: string,
) {
  if (sentAppliesToAll === undefined && sentIds === undefined) {
    return undefined;
  }

  return resolveScope(
    sentAppliesToAll ?? current.appliesToAll,
    sentIds ?? current.ids,
    message,
  );
}

function assertValidity(startIn: Date, validUntil: Date | null) {
  if (validUntil !== null && validUntil.getTime() < startIn.getTime()) {
    throw new AppError(
      "O fim da vigência não pode ser anterior ao início",
      400,
    );
  }
}

// `rule` e `fishing_ban_type` andam juntos: se vier so um, o outro vem da
// norma atual.
function mergeNorm(
  rule: string | undefined,
  fishingBanType: FishingBanType | undefined,
  current: PeriodCurrentState,
): FishingBanNormType | undefined {
  if (rule === undefined && fishingBanType === undefined) {
    return undefined;
  }

  return {
    rule: rule ?? current.fishing_ban.name,
    fishing_ban_type:
      fishingBanType ?? (current.fishing_ban.fishing_ban_type as FishingBanType),
  };
}

// Aplica as regras ao periodo mesclado com o atual e devolve os campos a
// gravar, com as listas ja resolvidas.
function mergeFields(
  fields: UpdateFishingBanPeriodFields,
  current: PeriodCurrentState,
): UpdateFishingBanPeriodFields {
  assertValidity(
    fields.start_in ?? current.start_in,
    fields.valid_until === undefined ? current.valid_until : fields.valid_until,
  );

  const speciesIds = mergeScope(
    fields.applies_to_all_species,
    fields.species_ids,
    {
      appliesToAll: current.applies_to_all_species,
      ids: current.fishing_ban_species.map((link) => link.fk_species_id),
    },
    SPECIES_SCOPE_MESSAGE,
  );
  const locationTypeIds = mergeScope(
    fields.applies_to_all_location_types,
    fields.location_type_ids,
    {
      appliesToAll: current.applies_to_all_location_types,
      ids: current.fishing_ban_type_location.map((link) => link.fk_type_location_id),
    },
    LOCATION_TYPES_SCOPE_MESSAGE,
  );

  return {
    ...fields,
    ...(speciesIds !== undefined && { species_ids: speciesIds }),
    ...(locationTypeIds !== undefined && { location_type_ids: locationTypeIds }),
  };
}

// MMDD numerico (15 de novembro -> 1115): o ano nao entra na janela.
function toMonthDayNumber(date: Date) {
  return (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

// A janela pode virar o ano (11-15 -> 03-15): nesse caso a data vale do
// inicio ate o fim do ano ou do comeco do ano ate o fim da janela.
function isDateInRecurringWindow(date: Date, startDate: Date, endDate: Date) {
  const day = toMonthDayNumber(date);
  const start = toMonthDayNumber(startDate);
  const end = toMonthDayNumber(endDate);

  if (start <= end) {
    return start <= day && day <= end;
  }

  return day >= start || day <= end;
}

function appliesToSpecies(period: InEffectCandidate, speciesId: number) {
  return (
    period.applies_to_all_species ||
    period.fishing_ban_species.some((link) => link.fk_species_id === speciesId)
  );
}

function toInEffectPeriod(period: InEffectCandidate) {
  return {
    id: period.id,
    rule: ruleText(period.fishing_ban),
    start_date: toMonthDay(period.start_date),
    end_date: toMonthDay(period.end_date),
  };
}

export const fishingBanPeriodsServices = {
  /**
   * Lista os períodos de defeso, vigentes e encerrados, com a cobertura
   * resumida (contagem de municípios e UFs).
   */
  async getAll() {
    const periods = await fishingBanPeriodsRepository.getAll();

    return periods.map(toListResponse);
  },

  /**
   * Seleciona um período de defeso pelo ID, com os municípios cobertos.
   */
  async getById(payload: unknown) {
    const id = idParam.parse(payload);

    const period = await fishingBanPeriodsRepository.getById(id);

    if (!period) {
      throw new AppError(NOT_FOUND_MESSAGE, 404);
    }

    return toDetailResponse(period);
  },

  /**
   * Diz, para cada espécie, se ela está em defeso na data, no município e
   * no tipo de local informados (passo "Espécie em defeso?" do registro de
   * pesca). Só informa; não bloqueia o registro.
   */
  async getInEffect(query: unknown) {
    const filters = inEffectQuerySchema.parse(query);

    const candidates =
      await fishingBanPeriodsRepository.getInEffectCandidates(filters);
    const periods = candidates.filter((period) =>
      isDateInRecurringWindow(filters.date, period.start_date, period.end_date),
    );

    return filters.speciesIds.map((speciesId) => {
      const matches = periods.filter((period) =>
        appliesToSpecies(period, speciesId),
      );

      return {
        species_id: speciesId,
        is_in_fishing_ban: matches.length > 0,
        periods: matches.map(toInEffectPeriod),
      };
    });
  },

  /**
   * Cria um período de defeso (somente admin). Reaproveita a norma com o
   * mesmo texto de portaria ou cria uma.
   */
  async create(payload: unknown) {
    const data = createFishingBanPeriodSchema.parse(payload);

    assertValidity(data.start_in, data.valid_until ?? null);

    const period = await fishingBanPeriodsRepository.create({
      ...data,
      species_ids: resolveScope(
        data.applies_to_all_species,
        data.species_ids,
        SPECIES_SCOPE_MESSAGE,
      ),
      location_type_ids: resolveScope(
        data.applies_to_all_location_types,
        data.location_type_ids,
        LOCATION_TYPES_SCOPE_MESSAGE,
      ),
    });

    return toDetailResponse(period);
  },

  /**
   * Atualiza um período de defeso (somente admin). Listas enviadas
   * substituem as anteriores inteiras.
   */
  async update(idPayload: unknown, payload: unknown) {
    const id = idParam.parse(idPayload);
    const { rule, fishing_ban_type, ...fields } =
      updateFishingBanPeriodSchema.parse(payload);

    const current = await fishingBanPeriodsRepository.getForUpdate(id);

    if (!current) {
      throw new AppError(NOT_FOUND_MESSAGE, 404);
    }

    const period = await fishingBanPeriodsRepository.update(
      id,
      mergeFields(fields, current),
      mergeNorm(rule, fishing_ban_type, current),
    );

    return toDetailResponse(period);
  },
};
