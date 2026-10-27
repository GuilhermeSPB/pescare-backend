import { AppError } from "@shared/errors/app-error.js";
import { idParam } from "@shared/schemas/id-param.js";
import { comparePassword, hashPassword } from "@shared/utils/password.js";
import type { Role } from "@shared/constants/roles.js";
import { usersRepository } from "./users.repository.js";
import {
  adminUpdateUserSchema,
  changePasswordSchema,
  createUserSchema,
  listUsersSchema,
  updateMeSchema,
} from "./users.schema.js";

interface Requester {
  id: number;
  role: Role;
}

async function findOrFail(id: number) {
  const user = await usersRepository.getById(id);

  if (!user) {
    throw new AppError("Usuário não encontrado", 404);
  }

  return user;
}

export const usersServices = {
  /**
   * Retorna o próprio usuário autenticado.
   */
  async getMe(userId: number) {
    return await findOrFail(userId);
  },

  /**
   * Atualiza nome e/ou município do próprio usuário.
   */
  async updateMe(userId: number, payload: unknown) {
    const data = updateMeSchema.parse(payload);

    return await usersRepository.update(userId, data);
  },

  /**
   * Troca a senha do próprio usuário, exigindo a senha atual.
   */
  async changePassword(userId: number, payload: unknown) {
    const data = changePasswordSchema.parse(payload);

    const currentHash = await usersRepository.getPasswordHash(userId);

    if (!currentHash) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const matches = await comparePassword(data.current_password, currentHash);

    if (!matches) {
      throw new AppError("Senha atual incorreta", 400);
    }

    await usersRepository.updatePassword(
      userId,
      await hashPassword(data.new_password),
    );
  },

  /**
   * Lista os usuários (somente admin), com filtro por ativo e por role.
   */
  async getAll(query: unknown) {
    const filters = listUsersSchema.parse(query);

    return await usersRepository.getAll(filters);
  },

  /**
   * Seleciona um usuário pelo ID. Fora o admin, cada um só vê a si mesmo.
   */
  async getById(requester: Requester, payload: unknown) {
    const id = idParam.parse(payload);

    if (requester.role !== "ADMIN" && requester.id !== id) {
      throw new AppError("Acesso negado", 403);
    }

    return await findOrFail(id);
  },

  /**
   * Cria um usuário com qualquer role (somente admin).
   */
  async create(payload: unknown) {
    const data = createUserSchema.parse(payload);

    if (await usersRepository.getByEmail(data.email)) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    return await usersRepository.create({
      ...data,
      password: await hashPassword(data.password),
    });
  },

  /**
   * Altera role e/ou status de um usuário (somente admin).
   */
  async adminUpdate(requester: Requester, idPayload: unknown, payload: unknown) {
    const id = idParam.parse(idPayload);
    const data = adminUpdateUserSchema.parse(payload);

    // Evita que o admin tire o proprio acesso e o sistema fique sem admin.
    const removesOwnAccess =
      data.is_active === false || (data.role !== undefined && data.role !== "ADMIN");

    if (id === requester.id && removesOwnAccess) {
      throw new AppError(
        "Você não pode desativar nem rebaixar o próprio usuário",
        400,
      );
    }

    await findOrFail(id);

    return await usersRepository.update(id, data);
  },
};
