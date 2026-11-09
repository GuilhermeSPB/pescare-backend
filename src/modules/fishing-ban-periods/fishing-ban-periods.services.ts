import { Prisma } from "@core/prisma.js";
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
  createFishingBanPeriodVersionSchema,
  inEffectQuerySchema,
  municipalityQuerySchema,
  updateFishingBanPeriodSchema,
  type CreateFishingBanPeriodVersionType,
  type UpdateFishingBanPeriodFields,
} from "./fishing-ban-periods.schema.js";
import {
  assertPreviousEndsBefore,
  assertStartIsFree,
  assertStartsAfter,
  buildVersionChains,
  findActiveNeighbors,
  resolveEndBeforeNext,
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

const NOT_FOUND_MESSAGE = "Período de defeso não encontrado";
const SPECIES_SCOPE_MESSAGE =
  "Informe ao menos uma espécie ou marque todas as espécies";
const LOCATION_TYPES_SCOPE_MESSAGE =
  "Informe ao menos um tipo de local ou marque todos os tipos de local";
const OLD_VERSION_MESSAGE = "Vigências antigas não podem ser alteradas";
const ONLY_CURRENT_VERSION_MESSAGE =
  "Só a vigência atual e ativa de um período pode dar lugar a uma nova";
const PENDING_DRAFT_MESSAGE = "Este período já tem uma nova vigência em rascunho";
const ALREADY_ACTIVE_MESSAGE = "Este período já está ativo";
const CORRECTION_REQUIRED_MESSAGE =
  "Esta vigência já começou. Se a norma mudou, crie uma nova vigência; " +
  "se foi erro de cadastro, confirme a correção";

// O nome e a chave unica que uma escrita aqui pode violar: o inicio da versao e o rascunho
// unico sao conferidos antes de gravar.
async function withUniqueBanName<T>(name: string | undefined, write: () => Promise<T>) {
  try {
    return await write();
  } catch (error) {
    if (
      name !== undefined &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(`Já existe um defeso com o nome "${name}"`, 409);
    }

    throw error;
  }
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
  rule,
  start_in,
  valid_until,
  ...period
}: PeriodBaseRow) {
  return {
    ...period,
    fishing_ban: {
      id: fishing_ban.id,
      name: fishing_ban.name,
      description: fishing_ban.description,
      rule,
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
    previous_version_id: info.previousId,
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
function resolveCreateData<T extends CreateFishingBanPeriodVersionType>(data: T): T {
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

function haveSameValues<T>(first: T[], second: T[]) {
  const values = new Set(first);

  return values.size === new Set(second).size && second.every((value) => values.has(value));
}

function windowKeys(windows: { start_date: Date; end_date: Date }[]) {
  return windows.map((window) => `${window.start_date.getTime()}-${window.end_date.getTime()}`);
}

// O painel envia o formulário inteiro: só conta o que difere do que está gravado.
function changesWhatTheVersionCovers(
  fields: UpdateFishingBanPeriodFields,
  current: PeriodCurrentState,
) {
  const differs = <T>(sent: T | undefined, stored: T) => sent !== undefined && sent !== stored;
  const listDiffers = <T>(sent: T[] | undefined, stored: T[]) =>
    sent !== undefined && !haveSameValues(sent, stored);

  return (
    differs(fields.rule, current.rule) ||
    differs(fields.start_in?.getTime(), current.start_in.getTime()) ||
    differs(fields.applies_to_all_species, current.applies_to_all_species) ||
    differs(fields.applies_to_all_location_types, current.applies_to_all_location_types) ||
    listDiffers(
      fields.windows && windowKeys(fields.windows),
      windowKeys(current.fishing_ban_period_window),
    ) ||
    listDiffers(
      fields.species_ids,
      current.fishing_ban_species.map((link) => link.fk_species_id),
    ) ||
    listDiffers(
      fields.location_type_ids,
      current.fishing_ban_type_location.map((link) => link.fk_type_location_id),
    ) ||
    listDiffers(
      fields.municipalities,
      current.fishing_ban_coverage.map((link) => link.fk_municipality_ibge_code),
    )
  );
}

// Mudar o que uma versão já iniciada cobre reescreve o passado: só com a confirmação de que
// é erro de cadastro. Mudança na norma é nova versão.
function assertCanRewriteVersion(
  fields: UpdateFishingBanPeriodFields,
  current: PeriodCurrentState,
  isCorrection: boolean | undefined,
) {
  const hasStarted = current.status === "ACTIVE" && current.start_in.getTime() <= Date.now();

  if (hasStarted && !isCorrection && changesWhatTheVersionCovers(fields, current)) {
    throw new AppError(CORRECTION_REQUIRED_MESSAGE, 409);
  }
}

// Corrigir o inicio de uma versao que substituiu outra move junto o fim da
// anterior, para o historico nao ficar com buraco nem sobreposicao.
async function resolvePreviousShift(
  id: number,
  newStartIn: Date | undefined,
  current: PeriodCurrentState,
): Promise<PreviousVersionEnd | undefined> {
  if (newStartIn === undefined) {
    return undefined;
  }

  const versions = await fishingBanPeriodsRepository.getBanVersions(current.fk_fishing_ban_id);

  assertStartIsFree(versions, newStartIn, id);

  const { previous } = findActiveNeighbors(versions, current.start_in, id);

  if (current.status !== "ACTIVE" || previous === null) {
    return undefined;
  }

  assertStartsAfter(previous.start_in, newStartIn);

  const endsOn = shiftSupersededEnd(previous.valid_until, current.start_in, newStartIn);

  assertPreviousEndsBefore(endsOn ?? previous.valid_until, newStartIn);

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
    rule: period.rule,
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
   * Cria um defeso com a primeira versão (somente admin), ativa ou como rascunho.
   */
  async create(payload: unknown) {
    const data = resolveCreateData(createFishingBanPeriodSchema.parse(payload));

    const period = await withUniqueBanName(data.name, () =>
      fishingBanPeriodsRepository.create(data),
    );

    return await toDetailWithVersion(period);
  },

  /**
   * Cria uma nova versão a partir da versão atual (somente admin). Ativa, ela encerra a
   * anterior na véspera do próprio início e, se começa antes de outra versão, termina na
   * véspera dela; como rascunho, nada muda até a ativação.
   */
  async createVersion(idPayload: unknown, payload: unknown) {
    const id = idParam.parse(idPayload);
    const data = resolveCreateData(createFishingBanPeriodVersionSchema.parse(payload));

    const current = await requirePeriodState(id);
    const info = requireVersionInfo(await loadVersionChains(), id);

    if (info.currentId !== id || current.status !== "ACTIVE") {
      throw new AppError(ONLY_CURRENT_VERSION_MESSAGE, 409);
    }

    if (info.pendingId !== null) {
      throw new AppError(PENDING_DRAFT_MESSAGE, 409);
    }

    const versions = await fishingBanPeriodsRepository.getBanVersions(current.fk_fishing_ban_id);

    assertStartIsFree(versions, data.start_in);

    if (data.status === "DRAFT") {
      const draft = await fishingBanPeriodsRepository.createVersion(current.fk_fishing_ban_id, data);

      return await toDetailWithVersion(draft);
    }

    const { previous, next } = findActiveNeighbors(versions, data.start_in);
    const period = await fishingBanPeriodsRepository.createVersion(
      current.fk_fishing_ban_id,
      { ...data, valid_until: resolveEndBeforeNext(data.valid_until ?? null, next) },
      previous
        ? { id: previous.id, endsOn: resolveSupersededEnd(previous.valid_until, data.start_in) }
        : undefined,
    );

    return await toDetailWithVersion(period);
  },

  /**
   * Ativa um rascunho (somente admin). A versão anterior passa a valer até a véspera do
   * início dele e, se há outra versão depois, ele vale até a véspera dela.
   */
  async activate(idPayload: unknown) {
    const id = idParam.parse(idPayload);

    const period = await requirePeriodState(id);

    if (period.status !== "DRAFT") {
      throw new AppError(ALREADY_ACTIVE_MESSAGE, 409);
    }

    const versions = await fishingBanPeriodsRepository.getBanVersions(period.fk_fishing_ban_id);
    const { previous, next } = findActiveNeighbors(versions, period.start_in, id);

    const activated = await fishingBanPeriodsRepository.activate(
      id,
      resolveEndBeforeNext(period.valid_until, next),
      previous
        ? { id: previous.id, endsOn: resolveSupersededEnd(previous.valid_until, period.start_in) }
        : undefined,
    );

    return await toDetailWithVersion(activated);
  },

  /**
   * Corrige a versão atual ou um rascunho no lugar (somente admin). Listas
   * enviadas substituem as anteriores inteiras; versões antigas são só
   * leitura. Nome, descrição e ambiente valem para o defeso inteiro.
   */
  async update(idPayload: unknown, payload: unknown) {
    const id = idParam.parse(idPayload);
    const { name, description, fishing_ban_type, correction, ...fields } =
      updateFishingBanPeriodSchema.parse(payload);

    const current = await requirePeriodState(id);
    const info = requireVersionInfo(await loadVersionChains(), id);

    if (info.currentId !== id && current.status !== "DRAFT") {
      throw new AppError(OLD_VERSION_MESSAGE, 409);
    }

    const merged = mergeFields(fields, current);

    assertCanRewriteVersion(merged, current, correction);

    const previous = await resolvePreviousShift(id, fields.start_in, current);
    const period = await withUniqueBanName(name, () =>
      fishingBanPeriodsRepository.update(
        id,
        current.fk_fishing_ban_id,
        merged,
        { name, description, fishing_ban_type },
        previous,
      ),
    );

    return await toDetailWithVersion(period);
  },
};
