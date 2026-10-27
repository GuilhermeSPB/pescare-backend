import { prisma } from "@core/prisma.js";
import { stripUndefined } from "@shared/utils/strip-undefined.js";
import type {
  AdminUpdateUserType,
  CreateUserType,
  ListUsersType,
  UpdateMeType,
} from "./users.schema.js";

// Nunca seleciona a senha (hash) para não vazar na resposta.
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  registration_date: true,
  role: true,
  is_active: true,
  fk_municipality_ibge_code: true,
  municipality: { select: { name: true, uf: true } },
} as const;

export const usersRepository = {
  getAll: async (filters: ListUsersType) => {
    return await prisma.users.findMany({
      where: stripUndefined({ is_active: filters.isActive, role: filters.role }),
      select: safeUserSelect,
      orderBy: { name: "asc" },
    });
  },

  getById: async (id: number) => {
    return await prisma.users.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  },

  // Unica consulta que traz o hash, usada so para conferir a senha atual.
  getPasswordHash: async (id: number) => {
    const user = await prisma.users.findUnique({
      where: { id },
      select: { password: true },
    });

    return user?.password ?? null;
  },

  getByEmail: async (email: string) => {
    return await prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });
  },

  create: async (data: CreateUserType) => {
    return await prisma.users.create({
      data,
      select: safeUserSelect,
    });
  },

  update: async (id: number, data: UpdateMeType | AdminUpdateUserType) => {
    return await prisma.users.update({
      where: { id },
      data: stripUndefined(data),
      select: safeUserSelect,
    });
  },

  updatePassword: async (id: number, passwordHash: string) => {
    await prisma.users.update({
      where: { id },
      data: { password: passwordHash },
    });
  },
};
