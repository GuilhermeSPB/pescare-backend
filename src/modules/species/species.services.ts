import { speciesRepository } from "./species.repository.js";
import { createSpeciesSchema, updateSpeciesSchema } from "./species.schema.js";
import { z } from "zod";

export const speciesServices = {
  /**
   * Cria uma nova espécie.
   */
  async create(payload: unknown) {
    const validatedData = createSpeciesSchema.parse(payload);

    return await speciesRepository.create(validatedData);
  },

  /**
   * Seleciona todas as espécies, com a opção de filtrar por ativas ou inativas.
   */
  async getAll(isActive?: boolean | undefined) {
    const isActiveFilter = isActive !== undefined ? isActive : undefined;

    const species = await speciesRepository.getAll(isActiveFilter);

    return species;
  },
  /**
   * Seleciona uma espécie pelo ID.
   */
  async getById(payload: number) {
    const id = z.number().int().parse(payload);

    const species = await speciesRepository.getById(id);

    return species;
  },

  /**
   * Atualiza uma espécie.
   */
  async update(payload: unknown) {
    const validatedData = updateSpeciesSchema.parse(payload);
    return await speciesRepository.update(validatedData);
  },
};
