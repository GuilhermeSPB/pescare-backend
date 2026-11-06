import { AppError } from "@shared/errors/app-error.js";
import { toIsoDate } from "@shared/utils/dates.js";

// Regras das versoes de um periodo. Cada versao aponta para a que substitui
// (fk_previous_period_id); a primeira nao aponta para nenhuma.

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface VersionRow {
  id: number;
  fk_previous_period_id: number | null;
  status: string;
}

export interface VersionInfo {
  // 1 e a versao mais antiga.
  version: number;
  // A ACTIVE mais nova da cadeia; num periodo que so tem rascunho, o rascunho.
  currentId: number;
  // Rascunho de nova versao esperando ativacao.
  pendingId: number | null;
  // Da versao mais nova para a mais antiga.
  chainIds: number[];
}

function followChain(firstId: number, nextIdByPreviousId: Map<number, number>) {
  const chain = [firstId];
  let nextId = nextIdByPreviousId.get(firstId);

  while (nextId !== undefined) {
    chain.push(nextId);
    nextId = nextIdByPreviousId.get(nextId);
  }

  return chain;
}

function describeChain(chain: number[], statusById: Map<number, string>) {
  const activeIds = chain.filter((id) => statusById.get(id) === "ACTIVE");
  const currentId = activeIds.at(-1) ?? chain.at(-1)!;
  const afterCurrentId = chain[chain.indexOf(currentId) + 1];
  const pendingId =
    afterCurrentId !== undefined && statusById.get(afterCurrentId) === "DRAFT"
      ? afterCurrentId
      : null;

  return { currentId, pendingId, chainIds: [...chain].reverse() };
}

/**
 * Monta as cadeias de versoes em memoria (sao poucas centenas de periodos) e
 * devolve, para cada periodo, o numero da versao, a atual e o rascunho.
 *
 * @example
 * buildVersionChains(rows).get(7) // { version: 2, currentId: 7, pendingId: 9, chainIds: [9, 7, 3] }
 */
export function buildVersionChains(rows: VersionRow[]) {
  const statusById = new Map(rows.map((row) => [row.id, row.status]));
  const nextIdByPreviousId = new Map<number, number>();

  for (const row of rows) {
    if (row.fk_previous_period_id !== null) {
      nextIdByPreviousId.set(row.fk_previous_period_id, row.id);
    }
  }

  const infoById = new Map<number, VersionInfo>();
  const firstVersions = rows.filter((row) => row.fk_previous_period_id === null);

  for (const first of firstVersions) {
    const chain = followChain(first.id, nextIdByPreviousId);
    const description = describeChain(chain, statusById);

    chain.forEach((id, index) => {
      infoById.set(id, { ...description, version: index + 1 });
    });
  }

  return infoById;
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
 * A nova versao precisa comecar depois do inicio da anterior; senao a
 * anterior terminaria antes de comecar.
 */
export function assertStartsAfter(previousStartIn: Date, newStartIn: Date) {
  if (newStartIn.getTime() > previousStartIn.getTime()) {
    return;
  }

  throw new AppError(
    `A nova versão precisa começar depois de ${formatBrazilianDate(previousStartIn)}, ` +
      `o início da versão anterior (recebido: ${formatBrazilianDate(newStartIn)})`,
    400,
  );
}
