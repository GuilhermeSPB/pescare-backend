import { targetGroupsRepository } from "./target-groups.repository.js";
import {
  createTargetGroupSchema,
  updateTargetGroupSchema,
} from "./target-groups.schema.js";
import { idParam } from "@shared/schemas/id-param.js";
import { AppError } from "@shared/errors/app-error.js";

export const targetGroupsServices = {
  /**
   * Cria um novo grupo alvo.
   */
  async create(payload: unknown) {
    const validatedData = createTargetGroupSchema.parse(payload);

    return await targetGroupsRepository.create(validatedData);
  },

  /**
   * Seleciona todos os grupos alvo, com a opção de filtrar por ativos ou inativos.
   */
  async getAll(isActive?: boolean | undefined) {
    return await targetGroupsRepository.getAll(isActive);
  },

  /**
   * Seleciona um grupo alvo pelo ID.
   */
  async getById(payload: unknown) {
    const id = idParam.parse(payload);

    const targetGroup = await targetGroupsRepository.getById(id);

    if (!targetGroup) {
      throw new AppError("Grupo alvo não encontrado", 404);
    }

    return targetGroup;
  },

  /**
   * Atualiza um grupo alvo.
   */
  async update(payload: unknown) {
    const validatedData = updateTargetGroupSchema.parse(payload);

    return await targetGroupsRepository.update(validatedData);
  },
};
