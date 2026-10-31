import { AppError } from "@shared/errors/app-error.js";
import { municipalitiesRepository } from "./municipalities.repository.js";
import {
  ibgeCodeParam,
  listMunicipalitiesSchema,
  updateMunicipalitySchema,
} from "./municipalities.schema.js";

async function findOrFail(ibgeCode: string) {
  const municipality = await municipalitiesRepository.getByIbgeCode(ibgeCode);

  if (!municipality) {
    throw new AppError("Município não encontrado", 404);
  }

  return municipality;
}

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

    return await findOrFail(ibgeCode);
  },

  /**
   * Corrige o nome de um município (somente admin). A próxima carga do
   * arquivo do IBGE (npm run seed-municipalities) volta ao nome do arquivo.
   */
  async update(ibgeCodePayload: unknown, payload: unknown) {
    const ibgeCode = ibgeCodeParam.parse(ibgeCodePayload);
    const data = updateMunicipalitySchema.parse(payload);

    await findOrFail(ibgeCode);

    return await municipalitiesRepository.update(ibgeCode, data);
  },
};
