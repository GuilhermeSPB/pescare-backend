import { targetGroupsRepository } from "./target-groups.repository.js";
import {
  createTargetGroupSchema,
  updateTargetGroupSchema,
} from "./target-groups.schema.js";
import { z } from "zod";

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
    const isActiveFilter = isActive !== undefined ? isActive : undefined;

    const targetGroups = await targetGroupsRepository.getAll(isActiveFilter);

    return targetGroups;
  },
  /**
   * Seleciona um grupo alvo pelo ID.
   */
  async getById(payload: number) {
    const id = z.number().int().parse(payload);

    const targetGroups = await targetGroupsRepository.getById(id);

    return targetGroups;
  },

  /**
   * Atualiza um grupo alvo.
   */
  async update(payload: unknown) {
    const validatedData = updateTargetGroupSchema.parse(payload);
    return await targetGroupsRepository.update(validatedData);
  },
};
