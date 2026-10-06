import { buyerTypesRepository } from "./buyer-types.repository.js";
import {
  createBuyerTypeSchema,
  updateBuyerTypeSchema,
} from "./buyer-types.schema.js";
import { z } from "zod";

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
    const isActiveFilter = isActive !== undefined ? isActive : undefined;

    const buyerTypes = await buyerTypesRepository.getAll(isActiveFilter);

    return buyerTypes;
  },
  /**
   * Seleciona um tipo de comprador pelo ID.
   */
  async getById(payload: number) {
    const id = z.number().int().parse(payload);

    const buyerTypes = await buyerTypesRepository.getById(id);

    return buyerTypes;
  },

  /**
   * Atualiza um tipo de comprador.
   */
  async update(payload: unknown) {
    const validatedData = updateBuyerTypeSchema.parse(payload);
    return await buyerTypesRepository.update(validatedData);
  },
};
