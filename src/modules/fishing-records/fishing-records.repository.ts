import { prisma } from "@core/prisma.js";
import type {
  CreateFishingRecordType,
  FishingRecordStatus,
} from "./fishing-records.schema.js";

// Mesmo formato em todas as leituras: o que o app precisa para mostrar a pesca inteira.
const fishingRecordInclude = {
  fishing_record_species: {
    include: { species: { select: { id: true, main_name: true } } },
    orderBy: { id: "asc" },
  },
  commercialization: {
    include: {
      commercialization_buyer: {
        include: { buyer_type: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

export const fishingRecordsRepository = {
  /**
   * Conta, entre os ids pedidos, quantos estão ativos em cada catálogo. Serve para recusar
   * opções desativadas ou inexistentes antes de gravar.
   */
  countActiveSpecies: (ids: number[]) =>
    prisma.species.count({ where: { id: { in: ids }, is_active: true } }),

  countActiveBuyerTypes: (ids: number[]) =>
    prisma.buyer_type.count({ where: { id: { in: ids }, is_active: true } }),

  findActiveTypeLocation: (id: number) =>
    prisma.typeLocation.findFirst({ where: { id, is_active: true }, select: { id: true } }),

  findActiveFishingMethod: (id: number) =>
    prisma.fishing_method.findFirst({ where: { id, is_active: true }, select: { id: true } }),

  create: (userId: number, data: CreateFishingRecordType) =>
    prisma.fishing_record.create({
      data: {
        fishing_date: new Date(`${data.fishing_date}T00:00:00.000Z`),
        status: data.status,
        fk_user_id: userId,
        fk_type_location_id: data.fk_type_location_id,
        fk_fishing_method_id: data.fk_fishing_method_id,
        fk_municipality_ibge_code: data.fk_municipality_ibge_code,
        location_name: data.location_name,
        fishing_record_species: {
          create: data.species.map((item) => ({
            fk_species_id: item.fk_species_id,
            quantity: item.quantity,
            unit_measure: item.unit_measure,
            ...(item.unit_value !== undefined && { unit_value: item.unit_value }),
            commercialized: item.commercialized,
          })),
        },
        ...(data.commercialization && {
          commercialization: {
              create: {
                commercialization_date: new Date(
                  `${data.commercialization.commercialization_date}T00:00:00.000Z`,
                ),
                total_value: data.commercialization.total_value,
                fk_municipality_ibge_code: data.fk_municipality_ibge_code,
                commercialization_buyer: {
                  create: data.commercialization.buyer_type_ids.map((id) => ({
                    fk_buyer_type_id: id,
                  })),
                },
              },
          },
        }),
      },
      include: fishingRecordInclude,
    }),

  /**
   * Pescas do usuário, da mais recente para a mais antiga, opcionalmente num período.
   */
  findManyByUser: (userId: number, range: { from: Date | null; to: Date | null }) =>
    prisma.fishing_record.findMany({
      where: {
        fk_user_id: userId,
        fishing_date: {
          ...(range.from && { gte: range.from }),
          ...(range.to && { lte: range.to }),
        },
      },
      include: fishingRecordInclude,
      orderBy: [{ fishing_date: "desc" }, { id: "desc" }],
    }),

  findByIdAndUser: (id: number, userId: number) =>
    prisma.fishing_record.findFirst({
      where: { id, fk_user_id: userId },
      include: fishingRecordInclude,
    }),

  updateStatus: (id: number, status: FishingRecordStatus) =>
    prisma.fishing_record.update({
      where: { id },
      data: { status },
      include: fishingRecordInclude,
    }),
};
