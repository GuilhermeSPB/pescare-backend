import { buyerTypesRepository } from "./buyer-types.repository.js";
import {
  createBuyerTypeSchema,
  updateBuyerTypeSchema,
} from "./buyer-types.schema.js";
import { idParam } from "@shared/schemas/id-param.js";
import { AppError } from "@shared/errors/app-error.js";

export const buyerTypesServices = {
  /**
   * Cria um novo tipo de comprador.
   */
  async create(payload: unknown) {
    const validatedData = createBuyerTypeSchema.parse(payload);

    return await buyerTypesRepository.create(validatedData);
  },

  /**
   * Seleciona todos os tipos de comprador, com a opção de filtrar por ativos ou inativos.
   */
  async getAll(isActive?: boolean | undefined) {
    return await buyerTypesRepository.getAll(isActive);
  },

  /**
   * Seleciona um tipo de comprador pelo ID.
   */
  async getById(payload: unknown) {
    const id = idParam.parse(payload);

    const buyerType = await buyerTypesRepository.getById(id);

    if (!buyerType) {
      throw new AppError("Tipo de comprador não encontrado", 404);
    }

    return buyerType;
  },

  /**
   * Atualiza um tipo de comprador.
   */
  async update(payload: unknown) {
    const validatedData = updateBuyerTypeSchema.parse(payload);

    return await buyerTypesRepository.update(validatedData);
  },
};
