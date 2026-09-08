import { prisma } from "@core/prisma.js";

export const locationFishingsRepository = {
  create: async (data: any) => {
    return prisma.typeLocation.create({
      data,
    });
  },

  findAll: async (filters?: boolean | undefined) => {
    return prisma.typeLocation.findMany({
      where: (filters !== undefined ? { is_active: filters } : {}) as any,
    });
  },
};
