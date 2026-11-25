import { prisma } from "@core/prisma.js";
import {
  ACCENTED_LETTERS,
  UNACCENTED_LETTERS,
  buildAccentInsensitivePattern,
} from "@shared/utils/accent-insensitive-search.js";
import { stripUndefined } from "@shared/utils/strip-undefined.js";
import type { Role } from "@shared/constants/roles.js";
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

// SQL direto porque o Prisma nao compara ignorando acentos. Devolve so os ids;
// as linhas vem do findMany, com o select seguro de sempre.
async function findUserIdsBySearch(searchTerm: string, filters: ListUsersType) {
  const pattern = buildAccentInsensitivePattern(searchTerm);
  const isActive = filters.isActive ?? null;
  const role = filters.role ?? null;
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM pescare.users
    WHERE (${isActive}::boolean IS NULL OR is_active = ${isActive}::boolean)
      AND (${role}::text IS NULL OR role = ${role}::text)
      AND (
        translate(lower(name), ${ACCENTED_LETTERS}, ${UNACCENTED_LETTERS}) LIKE ${pattern}
        OR translate(lower(email), ${ACCENTED_LETTERS}, ${UNACCENTED_LETTERS}) LIKE ${pattern}
      )
    ORDER BY name ASC
    LIMIT ${filters.limit ?? null}::int
  `;

  return rows.map((row) => row.id);
}

export const usersRepository = {
  getAll: async (filters: ListUsersType) => {
    const matchingIds =
      filters.search === undefined
        ? undefined
        : await findUserIdsBySearch(filters.search, filters);

    return await prisma.users.findMany({
      where: {
        ...stripUndefined({ is_active: filters.isActive, role: filters.role }),
        ...(matchingIds !== undefined && { id: { in: matchingIds } }),
      },
      select: safeUserSelect,
      orderBy: { name: "asc" },
      ...(filters.limit !== undefined && { take: filters.limit }),
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

  create: async (data: CreateUserType & { role: Role }) => {
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
