import { locationFishingsRepository } from "./location-fishings.repository.js";
import {
  createLocationFishingSchema,
  updateLocationFishingSchema,
} from "./location-fishings.schema.js";
import { z } from "zod";

export const locationFishingsServices = {
  /**
   * Cria um novo tipo de local de pesca.
   */
  async create(payload: unknown) {
    const validatedData = createLocationFishingSchema.parse(payload);

    return await locationFishingsRepository.create(validatedData);
  },

  /**
   * Seleciona todos os tipos de locais de pesca, com a opção de filtrar por ativos ou inativos.
   */
  async getAll(isActive?: boolean | undefined) {
    const isActiveFilter = isActive !== undefined ? isActive : undefined;

    const locationFishings =
      await locationFishingsRepository.getAll(isActiveFilter);

    return locationFishings;
  },
  /**
   * Seleciona um tipo de local de pesca pelo ID.
   */
  async getById(payload: number) {
    const id = z.number().int().parse(payload);

    const locationFishings = await locationFishingsRepository.getById(id);

    return locationFishings;
  },

  /**
   * Atualiza um tipo de local de pesca.
   */
  async update(payload: unknown) {
    const validatedData = updateLocationFishingSchema.parse(payload);
    return await locationFishingsRepository.update(validatedData);
  },
};
