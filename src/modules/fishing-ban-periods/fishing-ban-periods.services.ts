import { AppError } from "@shared/errors/app-error.js";
import { idParam } from "@shared/schemas/id-param.js";
import type { Role } from "@shared/constants/roles.js";
import { toIsoDate, toMonthDay } from "@shared/utils/dates.js";
import {
  fishingBanPeriodsRepository,
  type PreviousVersionEnd,
} from "./fishing-ban-periods.repository.js";
import {
  createFishingBanPeriodSchema,
  inEffectQuerySchema,
  municipalityQuerySchema,
  updateFishingBanPeriodSchema,
  type CreateFishingBanPeriodType,
  type FishingBanNormType,
  type FishingBanType,
  type UpdateFishingBanPeriodFields,
} from "./fishing-ban-periods.schema.js";
import {
  assertStartsAfter,
  buildVersionChains,
  resolveSupersededEnd,
  shiftSupersededEnd,
  type VersionInfo,
} from "./fishing-ban-periods.versions.js";
import {
  classifyOnDate,
  isDateInRecurringWindow,
  nextStartOnOrAfter,
  type DateClassification,
} from "./fishing-ban-periods.calendar.js";

type PeriodListRow = Awaited<
  ReturnType<typeof fishingBanPeriodsRepository.getAll>
>[number];
type PeriodDetailRow = NonNullable<
  Awaited<ReturnType<typeof fishingBanPeriodsRepository.getById>>
>;
type PeriodBaseRow = Omit<PeriodDetailRow, "fishing_ban_coverage">;
type PeriodWindowRow = PeriodBaseRow["fishing_ban_period_window"][number];
type PeriodCurrentState = NonNullable<
  Awaited<ReturnType<typeof fishingBanPeriodsRepository.getForUpdate>>
>;
type InEffectCandidate = Awaited<
  ReturnType<typeof fishingBanPeriodsRepository.getInEffectCandidates>
>[number];
type MunicipalityCandidate = Awaited<
  ReturnType<typeof fishingBanPeriodsRepository.getForMunicipality>
>[number];
type MunicipalityEntry = NonNullable<ReturnType<typeof toMunicipalityEntry>>;

interface FishingBanText {
  name: string;
  rule: string | null;
}

const NOT_FOUND_MESSAGE = "Período de defeso não encontrado";
const SPECIES_SCOPE_MESSAGE =
  "Informe ao menos uma espécie ou marque todas as espécies";
const LOCATION_TYPES_SCOPE_MESSAGE =
  "Informe ao menos um tipo de local ou marque todos os tipos de local";
const OLD_VERSION_MESSAGE = "Versões antigas não podem ser alteradas";
const ONLY_CURRENT_VERSION_MESSAGE =
  "Só a versão atual e ativa de um período pode ganhar uma nova versão";
const PENDING_DRAFT_MESSAGE = "Este período já tem uma nova versão em rascunho";
const ALREADY_ACTIVE_MESSAGE = "Este período já está ativo";

// Normas criadas fora da API podem ter `rule` vazio; `name` guarda o mesmo
// texto nas criadas por aqui.
function ruleText(fishingBan: FishingBanText) {
  return fishingBan.rule ?? fishingBan.name;
}

function toWindowResponse(window: PeriodWindowRow) {
  return {
    start_date: toMonthDay(window.start_date),
    end_date: toMonthDay(window.end_date),
  };
}

function toBaseResponse({
  fishing_ban,
  fishing_ban_period_window,
  fishing_ban_species,
  fishing_ban_type_location,
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
    windows: fishing_ban_period_window.map(toWindowResponse),
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

// O rascunho pendente so interessa na versao atual, que e onde a tela
// oferece "Abrir rascunho".
function toVersionFields(id: number, info: VersionInfo) {
  const isCurrentVersion = info.currentId === id;

  return {
    version: info.version,
    is_current_version: isCurrentVersion,
    pending_version_id: isCurrentVersion ? info.pendingId : null,
  };
}

async function loadVersionChains() {
  return buildVersionChains(await fishingBanPeriodsRepository.getVersionRows());
}

function requireVersionInfo(chains: Map<number, VersionInfo>, id: number) {
  const info = chains.get(id);

  if (!info) {
    throw new AppError(NOT_FOUND_MESSAGE, 404);
  }

  return info;
}

async function toDetailWithVersion(period: PeriodDetailRow) {
  const info = requireVersionInfo(await loadVersionChains(), period.id);

  return { ...toDetailResponse(period), ...toVersionFields(period.id, info) };
}

async function requirePeriodState(id: number) {
  const period = await fishingBanPeriodsRepository.getForUpdate(id);

  if (!period) {
    throw new AppError(NOT_FOUND_MESSAGE, 404);
  }

  return period;
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

// Regras comuns ao periodo novo e a nova versao.
function resolveCreateData(data: CreateFishingBanPeriodType): CreateFishingBanPeriodType {
  assertValidity(data.start_in, data.valid_until ?? null);

  return {
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
  };
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

// Corrigir o inicio de uma versao que substituiu outra move junto o fim da
// anterior, para o historico nao ficar com buraco nem sobreposicao.
function resolvePreviousShift(
  newStartIn: Date | undefined,
  current: PeriodCurrentState,
): PreviousVersionEnd | undefined {
  const previous = current.previous_period;

  if (newStartIn === undefined || previous === null) {
    return undefined;
  }

  assertStartsAfter(previous.start_in, newStartIn);

  if (current.status !== "ACTIVE") {
    return undefined;
  }

  const endsOn = shiftSupersededEnd(previous.valid_until, current.start_in, newStartIn);

  return endsOn && { id: previous.id, endsOn };
}

function isDateInAnyWindow(date: Date, period: InEffectCandidate) {
  return period.fishing_ban_period_window.some((window) =>
    isDateInRecurringWindow(date, window.start_date, window.end_date),
  );
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
    windows: period.fishing_ban_period_window.map(toWindowResponse),
  };
}

// Rascunho é trabalho do admin: o pescador só enxerga o que está ativo.
function isVisibleToRole(status: string, role?: Role) {
  return role !== "FISHER" || status === "ACTIVE";
}

// Situação do período no dia, na forma que a listagem da cidade devolve.
function toMunicipalityEntry(period: MunicipalityCandidate, date: Date) {
  const classification = classifyOnDate(
    {
      start_in: period.start_in,
      valid_until: period.valid_until,
      windows: period.fishing_ban_period_window,
    },
    date,
  );

  if (!classification) {
    return null;
  }

  return { ...toBaseResponse(period), ...toClassificationResponse(classification) };
}

function toClassificationResponse(classification: DateClassification) {
  return {
    status: classification.status,
    starts_on: classification.starts_on === null ? null : toIsoDate(classification.starts_on),
    ends_on: classification.ends_on === null ? null : toIsoDate(classification.ends_on),
  };
}

// Vigentes primeiro, com o que termina antes na frente; depois os próximos, pelo início.
function compareMunicipalityEntries(a: MunicipalityEntry, b: MunicipalityEntry) {
  const rank = (entry: MunicipalityEntry) => (entry.status === "EM_VIGOR" ? 0 : 1);
  const when = (entry: MunicipalityEntry) => entry.ends_on ?? entry.starts_on ?? "";

  return rank(a) - rank(b) || when(a).localeCompare(when(b)) || a.id - b.id;
}

export const fishingBanPeriodsServices = {
  /**
   * Lista os períodos de defeso, um por período: a versão atual, com a
   * cobertura resumida (contagem de municípios e UFs).
   */
  async getAll(role?: Role) {
    const periods = await fishingBanPeriodsRepository.getAll();
    const chains = buildVersionChains(periods);

    return periods
      .filter((period) => chains.get(period.id)?.currentId === period.id)
      .filter((period) => isVisibleToRole(period.status, role))
      .map((period) => ({
        ...toListResponse(period),
        ...toVersionFields(period.id, requireVersionInfo(chains, period.id)),
      }));
  },

  /**
   * Seleciona uma versão de período de defeso pelo ID, com os municípios
   * cobertos e a posição dela no histórico.
   */
  async getById(payload: unknown, role?: Role) {
    const id = idParam.parse(payload);

    const period = await fishingBanPeriodsRepository.getById(id);

    if (!period || !isVisibleToRole(period.status, role)) {
      throw new AppError(NOT_FOUND_MESSAGE, 404);
    }

    return await toDetailWithVersion(period);
  },

  /**
   * Lista todas as versões do período a que o ID pertence, da mais nova para
   * a mais antiga.
   */
  async getVersions(payload: unknown, role?: Role) {
    const id = idParam.parse(payload);

    const chains = await loadVersionChains();
    const { chainIds } = requireVersionInfo(chains, id);
    const periods = await fishingBanPeriodsRepository.getManyByIds(chainIds);
    const periodById = new Map(periods.map((period) => [period.id, period]));

    return chainIds.flatMap((versionId) => {
      const period = periodById.get(versionId);

      return period && isVisibleToRole(period.status, role)
        ? [{ ...toListResponse(period), ...toVersionFields(versionId, requireVersionInfo(chains, versionId)) }]
        : [];
    });
  },

  /**
   * Defesos que valem na cidade no dia: os vigentes e os que vão começar. Rascunho e
   * encerrados ficam de fora. Alimenta a home e a aba Defesos do pescador.
   *
   * @example
   * getForMunicipality({ municipality: "3550308", date: "2026-11-03" })
   */
  async getForMunicipality(query: unknown) {
    const { municipality, date } = municipalityQuerySchema.parse(query);
    const periods = await fishingBanPeriodsRepository.getForMunicipality(municipality, date);

    return periods
      .flatMap((period) => toMunicipalityEntry(period, date) ?? [])
      .sort(compareMunicipalityEntries);
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
      isDateInAnyWindow(filters.date, period),
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
   * Cria um período de defeso (somente admin), ativo ou como rascunho.
   * Reaproveita a norma com o mesmo texto de portaria ou cria uma.
   */
  async create(payload: unknown) {
    const data = resolveCreateData(createFishingBanPeriodSchema.parse(payload));

    const period = await fishingBanPeriodsRepository.create(data);

    return await toDetailWithVersion(period);
  },

  /**
   * Cria uma nova versão a partir da versão atual (somente admin). Ativa, ela
   * encerra a atual na véspera do próprio início; como rascunho, a atual
   * continua vigente até a ativação.
   */
  async createVersion(idPayload: unknown, payload: unknown) {
    const id = idParam.parse(idPayload);
    const data = resolveCreateData(createFishingBanPeriodSchema.parse(payload));

    const current = await requirePeriodState(id);
    const info = requireVersionInfo(await loadVersionChains(), id);

    if (info.currentId !== id || current.status !== "ACTIVE") {
      throw new AppError(ONLY_CURRENT_VERSION_MESSAGE, 409);
    }

    if (info.pendingId !== null) {
      throw new AppError(PENDING_DRAFT_MESSAGE, 409);
    }

    assertStartsAfter(current.start_in, data.start_in);

    const previous: PreviousVersionEnd = {
      id,
      ...(data.status === "ACTIVE" && {
        endsOn: resolveSupersededEnd(current.valid_until, data.start_in),
      }),
    };
    const period = await fishingBanPeriodsRepository.create(data, previous);

    return await toDetailWithVersion(period);
  },

  /**
   * Ativa um rascunho (somente admin). Se ele é a nova versão de outro
   * período, a versão anterior passa a valer até a véspera do início dele.
   */
  async activate(idPayload: unknown) {
    const id = idParam.parse(idPayload);

    const period = await requirePeriodState(id);

    if (period.status !== "DRAFT") {
      throw new AppError(ALREADY_ACTIVE_MESSAGE, 409);
    }

    const previous = period.previous_period;

    if (previous) {
      assertStartsAfter(previous.start_in, period.start_in);
    }

    const activated = await fishingBanPeriodsRepository.activate(
      id,
      previous
        ? { id: previous.id, endsOn: resolveSupersededEnd(previous.valid_until, period.start_in) }
        : undefined,
    );

    return await toDetailWithVersion(activated);
  },

  /**
   * Corrige a versão atual ou um rascunho no lugar (somente admin). Listas
   * enviadas substituem as anteriores inteiras; versões antigas são só
   * leitura.
   */
  async update(idPayload: unknown, payload: unknown) {
    const id = idParam.parse(idPayload);
    const { rule, fishing_ban_type, ...fields } =
      updateFishingBanPeriodSchema.parse(payload);

    const current = await requirePeriodState(id);
    const info = requireVersionInfo(await loadVersionChains(), id);

    if (info.currentId !== id && current.status !== "DRAFT") {
      throw new AppError(OLD_VERSION_MESSAGE, 409);
    }

    const period = await fishingBanPeriodsRepository.update(
      id,
      mergeFields(fields, current),
      mergeNorm(rule, fishing_ban_type, current),
      resolvePreviousShift(fields.start_in, current),
    );

    return await toDetailWithVersion(period);
  },
};
