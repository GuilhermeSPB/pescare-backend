import { Prisma } from "@core/prisma.js";
import { speciesRepository } from "./species.repository.js";
import { createSpeciesSchema, updateSpeciesSchema } from "./species.schema.js";
import { idParam } from "@shared/schemas/id-param.js";
import { AppError } from "@shared/errors/app-error.js";

// O nome cientifico e unico no banco (uq_species_scientific_name), a unica
// chave unica da tabela: P2002 aqui so pode ser ele.
async function withUniqueScientificName<T>(
  scientificName: unknown,
  write: () => Promise<T>,
) {
  try {
    return await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(
        `Já existe uma espécie com o nome científico "${String(scientificName)}"`,
        409,
      );
    }

    throw error;
  }
}

export const speciesServices = {
  /**
   * Cria uma nova espécie.
   */
  async create(payload: unknown) {
    const validatedData = createSpeciesSchema.parse(payload);

    return await withUniqueScientificName(validatedData.scientific_name, () =>
      speciesRepository.create(validatedData),
    );
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

    return await withUniqueScientificName(validatedData.data.scientific_name, () =>
      speciesRepository.update(validatedData),
    );
  },
};
