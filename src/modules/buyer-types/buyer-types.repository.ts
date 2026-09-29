import { prisma } from "@core/prisma.js";
import type {
  UpdateBuyerTypeType,
  CreateBuyerTypeType,
} from "./buyer-types.schema.js";

export const buyerTypesRepository = {
  create: async (data: CreateBuyerTypeType) => {
    return await prisma.buyer_type.create({
      data,
    });
  },

  getAll: async (filters?: boolean | undefined) => {
    return await prisma.buyer_type.findMany({
      where: (filters !== undefined ? { is_active: filters } : {}) as any,
    });
  },

  getById: async (id: number) => {
    return await prisma.buyer_type.findUnique({
      where: { id },
    });
  },

  update: async (object: UpdateBuyerTypeType) => {
    return await prisma.buyer_type.update({
      where: { id: object.id },
      data: object.data,
    });
  },
};
