import { prisma } from "@core/prisma.js";
import type { ListMunicipalitiesType } from "./municipalities.schema.js";

export const municipalitiesRepository = {
  getAll: async (filters: ListMunicipalitiesType) => {
    return await prisma.municipality.findMany({
      where: {
        ...(filters.uf !== undefined && { uf: filters.uf }),
        ...(filters.name !== undefined && {
          name: { contains: filters.name, mode: "insensitive" },
        }),
      },
      orderBy: { name: "asc" },
    });
  },

  getByIbgeCode: async (ibgeCode: string) => {
    return await prisma.municipality.findUnique({
      where: { ibge_code: ibgeCode },
    });
  },
};
