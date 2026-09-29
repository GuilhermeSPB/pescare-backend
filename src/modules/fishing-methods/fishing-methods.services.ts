import { fishingMethodsRepository } from "./fishing-methods.repository.js";
import {
  createFishingMethodSchema,
  updateFishingMethodSchema,
} from "./fishing-methods.schema.js";
import { z } from "zod";

export const fishingMethodsServices = {
  /**
   * Cria um novo método de pesca.
   */
  async create(payload: unknown) {
    const validatedData = createFishingMethodSchema.parse(payload);

    return await fishingMethodsRepository.create(validatedData);
  },

  /**
   * Seleciona todos os métodos de pesca, com a opção de filtrar por ativos ou inativos.
   */
  async getAll(isActive?: boolean | undefined) {
    const isActiveFilter = isActive !== undefined ? isActive : undefined;

    const fishingMethods =
      await fishingMethodsRepository.getAll(isActiveFilter);

    return fishingMethods;
  },
  /**
   * Seleciona um método de pesca pelo ID.
   */
  async getById(payload: number) {
    const id = z.number().int().parse(payload);

    const fishingMethods = await fishingMethodsRepository.getById(id);

    return fishingMethods;
  },

  /**
   * Atualiza um método de pesca.
   */
  async update(payload: unknown) {
    const validatedData = updateFishingMethodSchema.parse(payload);
    return await fishingMethodsRepository.update(validatedData);
  },
};
