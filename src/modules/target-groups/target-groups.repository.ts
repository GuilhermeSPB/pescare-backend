import { prisma } from "@core/prisma.js";
import type {
  UpdateTargetGroupType,
  CreateTargetGroupType,
} from "./target-groups.schema.js";

export const targetGroupsRepository = {
  create: async (data: CreateTargetGroupType) => {
    return await prisma.target_group.create({
      data,
    });
  },

  getAll: async (filters?: boolean | undefined) => {
    return await prisma.target_group.findMany({
      where: (filters !== undefined ? { is_active: filters } : {}) as any,
    });
  },

  getById: async (id: number) => {
    return await prisma.target_group.findUnique({
      where: { id },
    });
  },

  update: async (object: UpdateTargetGroupType) => {
    return await prisma.target_group.update({
      where: { id: object.id },
      data: object.data,
    });
  },
};
