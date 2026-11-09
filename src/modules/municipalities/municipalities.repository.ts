import { prisma } from "@core/prisma.js";
import {
  ACCENTED_LETTERS,
  UNACCENTED_LETTERS,
  buildAccentInsensitivePattern,
} from "@shared/utils/accent-insensitive-search.js";
import type {
  ListMunicipalitiesType,
  UpdateMunicipalityType,
} from "./municipalities.schema.js";

// SQL direto porque o Prisma nao compara ignorando acentos. Devolve so os
// codigos; as linhas vem do findMany, com o mesmo formato de sempre.
async function findIbgeCodesBySearch(
  searchTerm: string,
  filters: ListMunicipalitiesType,
) {
  const pattern = buildAccentInsensitivePattern(searchTerm);
  const rows = await prisma.$queryRaw<{ ibge_code: string }[]>`
    SELECT ibge_code
    FROM pescare.municipality
    WHERE (${filters.uf ?? null}::text IS NULL OR uf = ${filters.uf ?? null})
      AND (
        translate(lower(name), ${ACCENTED_LETTERS}, ${UNACCENTED_LETTERS}) LIKE ${pattern}
        OR ibge_code LIKE ${pattern}
      )
    ORDER BY name ASC
    LIMIT ${filters.limit ?? null}::int
  `;

  return rows.map((row) => row.ibge_code);
}

export const municipalitiesRepository = {
  getAll: async (filters: ListMunicipalitiesType) => {
    const matchingCodes =
      filters.search === undefined
        ? undefined
        : await findIbgeCodesBySearch(filters.search, filters);

    return await prisma.municipality.findMany({
      where: {
        ...(matchingCodes !== undefined && {
          ibge_code: { in: matchingCodes },
        }),
        ...(filters.uf !== undefined && { uf: filters.uf }),
        ...(filters.name !== undefined && {
          name: { contains: filters.name, mode: "insensitive" },
        }),
      },
      orderBy: { name: "asc" },
      ...(filters.limit !== undefined && { take: filters.limit }),
    });
  },

  getByIbgeCode: async (ibgeCode: string) => {
    return await prisma.municipality.findUnique({
      where: { ibge_code: ibgeCode },
    });
  },

  update: async (ibgeCode: string, data: UpdateMunicipalityType) => {
    return await prisma.municipality.update({
      where: { ibge_code: ibgeCode },
      data,
    });
  },
};
