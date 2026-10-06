import { prisma } from "@core/prisma.js";
import type {
  UpdateLocationFishingType,
  CreateLocationFishingType,
} from "./location-fishings.schema.js";

export const locationFishingsRepository = {
  create: async (data: CreateLocationFishingType) => {
    return await prisma.typeLocation.create({
      data,
    });
  },

  getAll: async (filters?: boolean | undefined) => {
    return await prisma.typeLocation.findMany({
      where: (filters !== undefined ? { is_active: filters } : {}) as any,
    });
  },

  getById: async (id: number) => {
    return await prisma.typeLocation.findUnique({
      where: { id },
    });
  },

  update: async (object: UpdateLocationFishingType) => {
    return await prisma.typeLocation.update({
      where: { id: object.id },
      data: object.data,
    });
  },
};
