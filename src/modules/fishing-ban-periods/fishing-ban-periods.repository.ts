import { prisma, Prisma } from "@core/prisma.js";
import { stripUndefined } from "@shared/utils/strip-undefined.js";
import type {
  CreateFishingBanPeriodType,
  FishingBanNormType,
  InEffectQueryType,
  UpdateFishingBanPeriodFields,
} from "./fishing-ban-periods.schema.js";

const periodLinks = {
  fishing_ban: {
    select: { id: true, name: true, rule: true, fishing_ban_type: true },
  },
  fishing_ban_species: {
    select: {
      species: { select: { id: true, main_name: true, scientific_name: true } },
    },
  },
  fishing_ban_type_location: {
    select: { type_location: { select: { id: true, name: true } } },
  },
} as const;

// A lista so resume a cobertura (contagem e UFs); os municipios vem no
// detalhe. Um periodo chega a 1.500 municipios.
const listInclude = {
  ...periodLinks,
  fishing_ban_coverage: { select: { municipality: { select: { uf: true } } } },
} as const;

const detailInclude = {
  ...periodLinks,
  fishing_ban_coverage: {
    select: {
      municipality: { select: { ibge_code: true, name: true, uf: true } },
    },
  },
} as const;

type PeriodLinks = Pick<
  UpdateFishingBanPeriodFields,
  "species_ids" | "location_type_ids" | "municipalities"
>;

function speciesRows(ids: number[]) {
  return ids.map((id) => ({ fk_species_id: id }));
}

function locationTypeRows(ids: number[]) {
  return ids.map((id) => ({ fk_type_location_id: id }));
}

function coverageRows(codes: string[]) {
  return codes.map((code) => ({ fk_municipality_ibge_code: code }));
}

// A norma e so o texto da portaria: `name` (chave unica) e `rule` guardam o
// mesmo texto. Reaproveita a norma com esse texto ou cria uma. Normas que
// perdem todos os periodos ficam no banco.
function upsertFishingBan(
  tx: Prisma.TransactionClient,
  { rule, fishing_ban_type }: FishingBanNormType,
) {
  return tx.fishing_ban.upsert({
    where: { name: rule },
    create: { name: rule, rule, fishing_ban_type },
    update: { fishing_ban_type },
    select: { id: true },
  });
}

// Cada lista enviada substitui a anterior inteira.
async function replaceLinks(
  tx: Prisma.TransactionClient,
  periodId: number,
  links: PeriodLinks,
) {
  const ofPeriod = { fk_fishing_ban_period_id: periodId };

  if (links.species_ids !== undefined) {
    await tx.fishing_ban_species.deleteMany({ where: ofPeriod });
    await tx.fishing_ban_species.createMany({
      data: speciesRows(links.species_ids).map((row) => ({ ...row, ...ofPeriod })),
    });
  }

  if (links.location_type_ids !== undefined) {
    await tx.fishing_ban_type_location.deleteMany({ where: ofPeriod });
    await tx.fishing_ban_type_location.createMany({
      data: locationTypeRows(links.location_type_ids).map((row) => ({ ...row, ...ofPeriod })),
    });
  }

  if (links.municipalities !== undefined) {
    await tx.fishing_ban_coverage.deleteMany({ where: ofPeriod });
    await tx.fishing_ban_coverage.createMany({
      data: coverageRows(links.municipalities).map((row) => ({ ...row, ...ofPeriod })),
    });
  }
}

export const fishingBanPeriodsRepository = {
  getAll: async () => {
    return await prisma.fishing_ban_period.findMany({
      include: listInclude,
      orderBy: [{ fishing_ban: { rule: "asc" } }, { start_date: "asc" }],
    });
  },

  getById: async (id: number) => {
    return await prisma.fishing_ban_period.findUnique({
      where: { id },
      include: detailInclude,
    });
  },

  // Estado atual usado pelo PUT para aplicar as regras ao periodo mesclado.
  getForUpdate: async (id: number) => {
    return await prisma.fishing_ban_period.findUnique({
      where: { id },
      select: {
        start_in: true,
        valid_until: true,
        applies_to_all_species: true,
        applies_to_all_location_types: true,
        fishing_ban: { select: { name: true, fishing_ban_type: true } },
        fishing_ban_species: { select: { fk_species_id: true } },
        fishing_ban_type_location: { select: { fk_type_location_id: true } },
      },
    });
  },

  // Candidatos pela vigencia, municipio, tipo de local e especies. A janela
  // recorrente (MM-DD) e filtrada no service.
  getInEffectCandidates: async (filters: InEffectQueryType) => {
    const { date, municipality, typeLocationId, speciesIds } = filters;

    return await prisma.fishing_ban_period.findMany({
      where: {
        start_in: { lte: date },
        fishing_ban_coverage: {
          some: { fk_municipality_ibge_code: municipality },
        },
        AND: [
          { OR: [{ valid_until: null }, { valid_until: { gte: date } }] },
          {
            OR: [
              { applies_to_all_location_types: true },
              {
                fishing_ban_type_location: {
                  some: { fk_type_location_id: typeLocationId },
                },
              },
            ],
          },
          {
            OR: [
              { applies_to_all_species: true },
              {
                fishing_ban_species: {
                  some: { fk_species_id: { in: speciesIds } },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        applies_to_all_species: true,
        fishing_ban: { select: { name: true, rule: true } },
        fishing_ban_species: {
          where: { fk_species_id: { in: speciesIds } },
          select: { fk_species_id: true },
        },
      },
      orderBy: { id: "asc" },
    });
  },

  create: async (data: CreateFishingBanPeriodType) => {
    const {
      rule,
      fishing_ban_type,
      species_ids,
      location_type_ids,
      municipalities,
      ...period
    } = data;

    return await prisma.$transaction(async (tx) => {
      const fishingBan = await upsertFishingBan(tx, { rule, fishing_ban_type });

      return await tx.fishing_ban_period.create({
        data: {
          ...stripUndefined(period),
          fk_fishing_ban_id: fishingBan.id,
          fishing_ban_species: {
            createMany: { data: speciesRows(species_ids) },
          },
          fishing_ban_type_location: {
            createMany: { data: locationTypeRows(location_type_ids) },
          },
          fishing_ban_coverage: {
            createMany: { data: coverageRows(municipalities) },
          },
        },
        include: detailInclude,
      });
    });
  },

  // Norma, ligacoes e periodo mudam na mesma transacao. Sem `norm`, o
  // periodo continua na norma atual.
  update: async (
    id: number,
    data: UpdateFishingBanPeriodFields,
    norm: FishingBanNormType | undefined,
  ) => {
    const { species_ids, location_type_ids, municipalities, ...period } = data;

    return await prisma.$transaction(async (tx) => {
      await replaceLinks(tx, id, data);

      const fishingBan = norm && (await upsertFishingBan(tx, norm));

      return await tx.fishing_ban_period.update({
        where: { id },
        data: {
          ...stripUndefined(period),
          ...(fishingBan && { fk_fishing_ban_id: fishingBan.id }),
        },
        include: detailInclude,
      });
    });
  },
};
