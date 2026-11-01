import { fishingLocationTypesRepository } from "./fishing-location-types.repository.js";
import {
  createFishingLocationTypeSchema,
  updateFishingLocationTypeSchema,
} from "./fishing-location-types.schema.js";
import { idParam } from "@shared/schemas/id-param.js";
import { AppError } from "@shared/errors/app-error.js";

export const fishingLocationTypesServices = {
  /**
   * Cria um novo tipo de local de pesca.
   */
  async create(payload: unknown) {
    const validatedData = createFishingLocationTypeSchema.parse(payload);

    return await fishingLocationTypesRepository.create(validatedData);
  },

  /**
   * Seleciona todos os tipos de locais de pesca, com a opção de filtrar por ativos ou inativos.
   */
  async getAll(isActive?: boolean | undefined) {
    return await fishingLocationTypesRepository.getAll(isActive);
  },

  /**
   * Seleciona um tipo de local de pesca pelo ID.
   */
  async getById(payload: unknown) {
    const id = idParam.parse(payload);

    const locationType = await fishingLocationTypesRepository.getById(id);

    if (!locationType) {
      throw new AppError("Tipo de local de pesca não encontrado", 404);
    }

    return locationType;
  },

  /**
   * Atualiza um tipo de local de pesca.
   */
  async update(payload: unknown) {
    const validatedData = updateFishingLocationTypeSchema.parse(payload);

    return await fishingLocationTypesRepository.update(validatedData);
  },
};
