import { prisma } from "@core/prisma.js";
import type {
  UpdateFishingMethodType,
  CreateFishingMethodType,
} from "./fishing-methods.schema.js";

export const fishingMethodsRepository = {
  create: async (data: CreateFishingMethodType) => {
    return await prisma.fishing_method.create({
      data,
    });
  },

  getAll: async (filters?: boolean | undefined) => {
    return await prisma.fishing_method.findMany({
      where: (filters !== undefined ? { is_active: filters } : {}) as any,
    });
  },

  getById: async (id: number) => {
    return await prisma.fishing_method.findUnique({
      where: { id },
    });
  },

  update: async (object: UpdateFishingMethodType) => {
    return await prisma.fishing_method.update({
      where: { id: object.id },
      data: object.data,
    });
  },
};
