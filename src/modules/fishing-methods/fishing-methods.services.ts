import { fishingMethodsRepository } from "./fishing-methods.repository.js";
import {
  createFishingMethodSchema,
  updateFishingMethodSchema,
} from "./fishing-methods.schema.js";
import { idParam } from "@shared/schemas/id-param.js";
import { AppError } from "@shared/errors/app-error.js";

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
    return await fishingMethodsRepository.getAll(isActive);
  },

  /**
   * Seleciona um método de pesca pelo ID.
   */
  async getById(payload: unknown) {
    const id = idParam.parse(payload);

    const fishingMethod = await fishingMethodsRepository.getById(id);

    if (!fishingMethod) {
      throw new AppError("Método de pesca não encontrado", 404);
    }

    return fishingMethod;
  },

  /**
   * Atualiza um método de pesca.
   */
  async update(payload: unknown) {
    const validatedData = updateFishingMethodSchema.parse(payload);

    return await fishingMethodsRepository.update(validatedData);
  },
};
