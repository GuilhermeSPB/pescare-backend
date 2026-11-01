import { prisma } from "@core/prisma.js";
import type {
  UpdateFishingLocationTypeType,
  CreateFishingLocationTypeType,
} from "./fishing-location-types.schema.js";

export const fishingLocationTypesRepository = {
  create: async (data: CreateFishingLocationTypeType) => {
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

  update: async (object: UpdateFishingLocationTypeType) => {
    return await prisma.typeLocation.update({
      where: { id: object.id },
      data: object.data,
    });
  },
};
