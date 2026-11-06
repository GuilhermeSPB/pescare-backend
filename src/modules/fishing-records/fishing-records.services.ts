import { AppError } from "@shared/errors/app-error.js";
import { idParam } from "@shared/schemas/id-param.js";
import { fishingRecordsRepository } from "./fishing-records.repository.js";
import { toFishingRecordResponse } from "./fishing-records.mapper.js";
import {
  createFishingRecordSchema,
  listFishingRecordsQuerySchema,
  updateFishingRecordSchema,
} from "./fishing-records.schema.js";

const FISHING_RECORD_NOT_FOUND = "Pesca não encontrada";

// Só catálogos ativos viram opção nova, como no app. Confere todos antes de gravar,
// para a resposta dizer o que está errado em vez de falhar no banco.
async function ensureActiveCatalogs(data: {
  fk_type_location_id: number;
  fk_fishing_method_id: number;
  species: { fk_species_id: number }[];
  commercialization?: { buyer_type_ids: number[] } | null | undefined;
}) {
  const speciesIds = data.species.map((item) => item.fk_species_id);
  const buyerTypeIds = data.commercialization?.buyer_type_ids ?? [];

  const [location, method, activeSpecies, activeBuyers] = await Promise.all([
    fishingRecordsRepository.findActiveTypeLocation(data.fk_type_location_id),
    fishingRecordsRepository.findActiveFishingMethod(data.fk_fishing_method_id),
    fishingRecordsRepository.countActiveSpecies(speciesIds),
    buyerTypeIds.length > 0
      ? fishingRecordsRepository.countActiveBuyerTypes(buyerTypeIds)
      : Promise.resolve(0),
  ]);

  if (!location) throw new AppError("Tipo de local não encontrado ou desativado", 400);
  if (!method) throw new AppError("Método de pesca não encontrado ou desativado", 400);
  if (activeSpecies !== speciesIds.length) {
    throw new AppError("Espécie não encontrada ou desativada", 400);
  }
  if (activeBuyers !== buyerTypeIds.length) {
    throw new AppError("Tipo de comprador não encontrado ou desativado", 400);
  }
}

export const fishingRecordsServices = {
  /**
   * Grava uma pesca com as capturas e, se houver, a venda. A pesca é do usuário logado.
   */
  async create(userId: number, payload: unknown) {
    const data = createFishingRecordSchema.parse(payload);

    await ensureActiveCatalogs(data);

    const record = await fishingRecordsRepository.create(userId, data);

    return toFishingRecordResponse(record);
  },

  /**
   * Pescas do usuário logado, com filtro opcional de período (from/to, AAAA-MM-DD).
   */
  async getAll(userId: number, query: unknown) {
    const { from, to } = listFishingRecordsQuerySchema.parse(query);

    const records = await fishingRecordsRepository.findManyByUser(userId, {
      from: from ? new Date(`${from}T00:00:00.000Z`) : null,
      to: to ? new Date(`${to}T00:00:00.000Z`) : null,
    });

    return records.map(toFishingRecordResponse);
  },

  /**
   * Uma pesca do usuário logado. Pesca de outro pescador responde como inexistente.
   */
  async getById(userId: number, payload: unknown) {
    const id = idParam.parse(payload);

    const record = await fishingRecordsRepository.findByIdAndUser(id, userId);

    if (!record) throw new AppError(FISHING_RECORD_NOT_FOUND, 404);

    return toFishingRecordResponse(record);
  },

  /**
   * Muda a situação da pesca (ex.: terminar uma pesca em andamento). Não há exclusão.
   */
  async updateStatus(userId: number, payload: unknown) {
    const { id, data } = updateFishingRecordSchema.parse(payload);

    const owned = await fishingRecordsRepository.findByIdAndUser(id, userId);

    if (!owned) throw new AppError(FISHING_RECORD_NOT_FOUND, 404);

    const record = await fishingRecordsRepository.updateStatus(id, data.status);

    return toFishingRecordResponse(record);
  },
};
