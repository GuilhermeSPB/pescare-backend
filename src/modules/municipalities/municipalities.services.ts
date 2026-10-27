import { AppError } from "@shared/errors/app-error.js";
import { municipalitiesRepository } from "./municipalities.repository.js";
import {
  ibgeCodeParam,
  listMunicipalitiesSchema,
} from "./municipalities.schema.js";

export const municipalitiesServices = {
  /**
   * Lista os municípios, com filtro opcional por UF e por parte do nome.
   */
  async getAll(query: unknown) {
    const filters = listMunicipalitiesSchema.parse(query);

    return await municipalitiesRepository.getAll(filters);
  },

  /**
   * Seleciona um município pelo código IBGE.
   */
  async getByIbgeCode(payload: unknown) {
    const ibgeCode = ibgeCodeParam.parse(payload);

    const municipality = await municipalitiesRepository.getByIbgeCode(ibgeCode);

    if (!municipality) {
      throw new AppError("Município não encontrado", 404);
    }

    return municipality;
  },
};
