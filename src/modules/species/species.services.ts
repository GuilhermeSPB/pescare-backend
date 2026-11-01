import { speciesRepository } from "./species.repository.js";
import { createSpeciesSchema, updateSpeciesSchema } from "./species.schema.js";
import { idParam } from "@shared/schemas/id-param.js";
import { AppError } from "@shared/errors/app-error.js";

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
    return await speciesRepository.getAll(isActive);
  },

  /**
   * Seleciona uma espécie pelo ID.
   */
  async getById(payload: unknown) {
    const id = idParam.parse(payload);

    const species = await speciesRepository.getById(id);

    if (!species) {
      throw new AppError("Espécie não encontrada", 404);
    }

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
