import { AppError } from "@shared/errors/app-error.js";
import { toIsoDate } from "@shared/utils/dates.js";

// Regras das versoes de um defeso. Cada versao e uma linha de fishing_ban_period do mesmo
// fishing_ban, e start_in define a ordem.

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface VersionRow {
  id: number;
  fk_fishing_ban_id: number;
  status: string;
  start_in: Date;
}

// O que as regras de vigencia precisam saber de cada versao do defeso.
export interface VersionValidity {
  id: number;
  status: string;
  start_in: Date;
  valid_until: Date | null;
}

export interface VersionInfo {
  // 1 e a versao mais antiga.
  version: number;
  // A ACTIVE mais nova do defeso; num defeso que so tem rascunho, o rascunho.
  currentId: number;
  // A ACTIVE que vem logo antes desta.
  previousId: number | null;
  // Rascunho esperando ativacao.
  pendingId: number | null;
  // Da versao mais nova para a mais antiga.
  chainIds: number[];
}

function isActive(version: { status: string }) {
  return version.status === "ACTIVE";
}

function describeChain(chain: VersionRow[]) {
  const currentId = chain.filter(isActive).at(-1)?.id ?? chain.at(-1)!.id;
  const pendingId =
    chain.find((row) => row.status === "DRAFT" && row.id !== currentId)?.id ?? null;

  return { currentId, pendingId, chainIds: chain.map((row) => row.id).reverse() };
}

function groupByFishingBan(rows: VersionRow[]) {
  const chains = new Map<number, VersionRow[]>();

  for (const row of rows) {
    chains.set(row.fk_fishing_ban_id, [...(chains.get(row.fk_fishing_ban_id) ?? []), row]);
  }

  return [...chains.values()].map((chain) =>
    chain.sort((a, b) => a.start_in.getTime() - b.start_in.getTime()),
  );
}

/**
 * Agrupa as versoes por defeso e devolve, para cada uma, o numero da versao, a atual, a
 * anterior e o rascunho.
 *
 * @example
 * buildVersionChains(rows).get(7) // { version: 2, currentId: 7, previousId: 3, pendingId: 9, chainIds: [9, 7, 3] }
 */
export function buildVersionChains(rows: VersionRow[]) {
  const infoById = new Map<number, VersionInfo>();

  for (const chain of groupByFishingBan(rows)) {
    const description = describeChain(chain);

    chain.forEach((row, index) => {
      const previous = chain.slice(0, index).filter(isActive).at(-1);

      infoById.set(row.id, {
        ...description,
        version: index + 1,
        previousId: previous?.id ?? null,
      });
    });
  }

  return infoById;
}

/**
 * As versoes ativas logo antes e logo depois de uma data, ignorando a propria versao.
 *
 * @param versions versoes do defeso, ordenadas por start_in.
 * @example
 * findActiveNeighbors(versions, new Date("2026-03-01")) // { previous: v1, next: null }
 */
export function findActiveNeighbors(
  versions: VersionValidity[],
  startIn: Date,
  ownId?: number,
) {
  const others = versions.filter((version) => isActive(version) && version.id !== ownId);
  const previous = others.filter((version) => version.start_in < startIn).at(-1) ?? null;
  const next = others.find((version) => version.start_in > startIn) ?? null;

  return { previous, next };
}

/**
 * O dia anterior a uma data DATE (meia-noite UTC).
 *
 * @example
 * dayBefore(new Date("2027-01-01")) // 2026-12-31
 */
export function dayBefore(date: Date) {
  return new Date(date.getTime() - DAY_IN_MS);
}

/**
 * Fim da versao substituida: a vespera do inicio da nova. Uma versao que ja
 * tinha encerrado antes mantem o fim que tinha.
 *
 * @example
 * resolveSupersededEnd(null, new Date("2027-01-01")) // 2026-12-31
 */
export function resolveSupersededEnd(previousValidUntil: Date | null, newStartIn: Date) {
  const eve = dayBefore(newStartIn);

  if (previousValidUntil === null || previousValidUntil.getTime() > eve.getTime()) {
    return eve;
  }

  return previousValidUntil;
}

/**
 * Novo fim da versao anterior quando a correcao muda o inicio da versao que a
 * substituiu. So acompanha o fim que veio da substituicao (a vespera do
 * inicio antigo); um encerramento anterior fica como estava.
 *
 * @returns a nova data, ou undefined quando nada muda.
 */
export function shiftSupersededEnd(
  previousValidUntil: Date | null,
  oldStartIn: Date,
  newStartIn: Date,
) {
  const isEndFromSupersession =
    previousValidUntil !== null &&
    previousValidUntil.getTime() === dayBefore(oldStartIn).getTime();

  if (!isEndFromSupersession || oldStartIn.getTime() === newStartIn.getTime()) {
    return undefined;
  }

  return dayBefore(newStartIn);
}

function formatBrazilianDate(date: Date) {
  const [year, month, day] = toIsoDate(date).split("-");

  return `${day}/${month}/${year}`;
}

/**
 * Fim de uma versao que tem outra ativa depois dela: sem fim informado, vale ate a vespera da
 * seguinte; um fim que invade a seguinte e recusado.
 *
 * @example
 * resolveEndBeforeNext(null, next) // a vespera de next.start_in
 */
export function resolveEndBeforeNext(validUntil: Date | null, next: VersionValidity | null) {
  if (next === null) {
    return validUntil;
  }

  const eve = dayBefore(next.start_in);

  if (validUntil === null) {
    return eve;
  }

  if (validUntil.getTime() > eve.getTime()) {
    throw new AppError(
      `A vigência precisa terminar até ${formatBrazilianDate(eve)}, ` +
        `véspera do início da vigência seguinte`,
      400,
    );
  }

  return validUntil;
}

/**
 * Duas versoes do mesmo defeso nao comecam no mesmo dia: e o inicio que define a ordem.
 */
export function assertStartIsFree(
  versions: VersionValidity[],
  startIn: Date,
  ownId?: number,
) {
  const isTaken = versions.some(
    (version) => version.id !== ownId && version.start_in.getTime() === startIn.getTime(),
  );

  if (isTaken) {
    throw new AppError(
      `Já existe uma vigência deste defeso começando em ${formatBrazilianDate(startIn)}`,
      400,
    );
  }
}

/**
 * Ao corrigir o inicio, a versao precisa continuar depois do inicio da anterior; senao a
 * anterior terminaria antes de comecar.
 */
export function assertStartsAfter(previousStartIn: Date, newStartIn: Date) {
  if (newStartIn.getTime() > previousStartIn.getTime()) {
    return;
  }

  throw new AppError(
    `A vigência precisa começar depois de ${formatBrazilianDate(previousStartIn)}, ` +
      `o início da vigência anterior (recebido: ${formatBrazilianDate(newStartIn)})`,
    400,
  );
}

/**
 * Depois de corrigir o inicio, a versao anterior precisa ter terminado antes dele.
 */
export function assertPreviousEndsBefore(previousEnd: Date | null, newStartIn: Date) {
  if (previousEnd !== null && previousEnd.getTime() < newStartIn.getTime()) {
    return;
  }

  throw new AppError(
    `O início não pode ser em ${formatBrazilianDate(newStartIn)}: ` +
      `a vigência anterior ainda vale nessa data`,
    400,
  );
}
