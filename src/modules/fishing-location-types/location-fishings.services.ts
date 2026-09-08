import { locationFishingsRepository } from "./location-fishings.repository.js";
import { createLocationFishingSchema } from "./location-fishing.schema.js";
import { z } from "zod";

type CreateLocationFishingInput = z.infer<typeof createLocationFishingSchema>;

export const locationFishingsServices = {
  /**
   * Cria um novo tipo de local de pesca.
   */
  async createLocationFishing(data: CreateLocationFishingInput) {
    const validatedData = createLocationFishingSchema.parse(data);

    return locationFishingsRepository.create(validatedData);
  },

  /**
   * Seleciona todos os tipos de locais de pesca, com a opção de filtrar por ativos ou inativos.
   */
  async getAllLocationFishings(isActive?: boolean | undefined) {
    const isActiveFilter = isActive !== undefined ? isActive : undefined;

    const locationFishings =
      await locationFishingsRepository.findAll(isActiveFilter);

    return locationFishings;
  },
};
