import { prisma } from "@core/prisma.js";
import type { UpdateSpeciesType, CreateSpeciesType } from "./species.schema.js";

export const speciesRepository = {
  create: async (data: CreateSpeciesType) => {
    const { target_group_id, ...rest } = data;

    return await prisma.species.create({
      data: { ...rest, fk_target_group_id: target_group_id } as any,
    });
  },

  getAll: async (filters?: boolean | undefined) => {
    return await prisma.species.findMany({
      where: (filters !== undefined ? { is_active: filters } : {}) as any,
    });
  },

  getById: async (id: number) => {
    return await prisma.species.findUnique({
      where: { id },
    });
  },

  update: async (object: UpdateSpeciesType) => {
    const { target_group_id, ...rest } = object.data as Record<string, any>;

    return await prisma.species.update({
      where: { id: object.id },
      data:
        target_group_id !== undefined
          ? { ...rest, fk_target_group_id: target_group_id }
          : rest,
    });
  },
};
