import { prisma, Prisma } from "@core/prisma.js";
import { stripUndefined } from "@shared/utils/strip-undefined.js";
import type {
  CreateFishingBanPeriodType,
  CreateFishingBanPeriodVersionType,
  FishingBanFields,
  FishingBanPeriodWindowType,
  InEffectQueryType,
  UpdateFishingBanPeriodFields,
} from "./fishing-ban-periods.schema.js";

const windowsSelect = {
  select: { start_date: true, end_date: true },
  orderBy: { start_date: "asc" },
} as const;

const periodLinks = {
  fishing_ban: {
    select: { id: true, name: true, description: true, fishing_ban_type: true },
  },
  fishing_ban_period_window: windowsSelect,
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
  "windows" | "species_ids" | "location_type_ids" | "municipalities"
>;

// Versao anterior que passa a valer ate `endsOn`.
export interface PreviousVersionEnd {
  id: number;
  endsOn: Date;
}

function windowRows(windows: FishingBanPeriodWindowType[]) {
  return windows.map(({ start_date, end_date }) => ({ start_date, end_date }));
}

function speciesRows(ids: number[]) {
  return ids.map((id) => ({ fk_species_id: id }));
}

function locationTypeRows(ids: number[]) {
  return ids.map((id) => ({ fk_type_location_id: id }));
}

function coverageRows(codes: string[]) {
  return codes.map((code) => ({ fk_municipality_ibge_code: code }));
}

// Os campos de uma versao nova, com as ligacoes.
function versionData({
  windows,
  species_ids,
  location_type_ids,
  municipalities,
  ...period
}: CreateFishingBanPeriodVersionType) {
  return {
    ...stripUndefined(period),
    fishing_ban_period_window: { createMany: { data: windowRows(windows) } },
    fishing_ban_species: { createMany: { data: speciesRows(species_ids) } },
    fishing_ban_type_location: { createMany: { data: locationTypeRows(location_type_ids) } },
    fishing_ban_coverage: { createMany: { data: coverageRows(municipalities) } },
  };
}

async function endPreviousVersion(
  tx: Prisma.TransactionClient,
  previous: PreviousVersionEnd | undefined,
) {
  if (previous === undefined) {
    return;
  }

  await tx.fishing_ban_period.update({
    where: { id: previous.id },
    data: { valid_until: previous.endsOn },
  });
}

// Cada lista enviada substitui a anterior inteira.
async function replaceLinks(
  tx: Prisma.TransactionClient,
  periodId: number,
  links: PeriodLinks,
) {
  const ofPeriod = { fk_fishing_ban_period_id: periodId };

  if (links.windows !== undefined) {
    await tx.fishing_ban_period_window.deleteMany({ where: ofPeriod });
    await tx.fishing_ban_period_window.createMany({
      data: windowRows(links.windows).map((row) => ({ ...row, ...ofPeriod })),
    });
  }

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
      orderBy: [{ fishing_ban: { name: "asc" } }, { start_in: "asc" }],
    });
  },

  getManyByIds: async (ids: number[]) => {
    return await prisma.fishing_ban_period.findMany({
      where: { id: { in: ids } },
      include: listInclude,
    });
  },

  getById: async (id: number) => {
    return await prisma.fishing_ban_period.findUnique({
      where: { id },
      include: detailInclude,
    });
  },

  // So o necessario para montar as cadeias de versoes.
  getVersionRows: async () => {
    return await prisma.fishing_ban_period.findMany({
      select: { id: true, fk_fishing_ban_id: true, status: true, start_in: true },
    });
  },

  // Vigencia das versoes de um defeso, da mais antiga para a mais nova.
  getBanVersions: async (fishingBanId: number) => {
    return await prisma.fishing_ban_period.findMany({
      where: { fk_fishing_ban_id: fishingBanId },
      select: { id: true, status: true, start_in: true, valid_until: true },
      orderBy: { start_in: "asc" },
    });
  },

  // Estado atual usado pelo PUT, pela nova versao e pela ativacao.
  getForUpdate: async (id: number) => {
    return await prisma.fishing_ban_period.findUnique({
      where: { id },
      select: {
        fk_fishing_ban_id: true,
        status: true,
        rule: true,
        start_in: true,
        valid_until: true,
        applies_to_all_species: true,
        applies_to_all_location_types: true,
        fishing_ban_period_window: windowsSelect,
        fishing_ban_species: { select: { fk_species_id: true } },
        fishing_ban_type_location: { select: { fk_type_location_id: true } },
        fishing_ban_coverage: { select: { fk_municipality_ibge_code: true } },
      },
    });
  },

  // Candidatos pela vigencia, municipio, tipo de local e especies. Rascunho
  // nunca vale. As janelas recorrentes (MM-DD) sao filtradas no service.
  getInEffectCandidates: async (filters: InEffectQueryType) => {
    const { date, municipality, typeLocationId, speciesIds } = filters;

    return await prisma.fishing_ban_period.findMany({
      where: {
        status: "ACTIVE",
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
        rule: true,
        applies_to_all_species: true,
        fishing_ban_period_window: windowsSelect,
        fishing_ban_species: {
          where: { fk_species_id: { in: speciesIds } },
          select: { fk_species_id: true },
        },
      },
      orderBy: { id: "asc" },
    });
  },

  // Candidatos a vigente ou proximo na cidade: ativos e ainda nao encerrados na data.
  // A janela, o inicio da vigencia e o status final saem no service.
  getForMunicipality: async (municipality: string, date: Date) => {
    return await prisma.fishing_ban_period.findMany({
      where: {
        status: "ACTIVE",
        fishing_ban_coverage: {
          some: { fk_municipality_ibge_code: municipality },
        },
        OR: [{ valid_until: null }, { valid_until: { gte: date } }],
      },
      include: periodLinks,
      orderBy: [{ rule: "asc" }, { id: "asc" }],
    });
  },

  // Defeso novo com a primeira versao.
  create: async ({
    name,
    description,
    fishing_ban_type,
    ...version
  }: CreateFishingBanPeriodType) => {
    return await prisma.fishing_ban_period.create({
      data: {
        ...versionData(version),
        fishing_ban: {
          create: stripUndefined({ name, description, fishing_ban_type }),
        },
      },
      include: detailInclude,
    });
  },

  // Nova versao de um defeso. Quando ela substitui outra, a anterior e encerrada na mesma
  // transacao.
  createVersion: async (
    fishingBanId: number,
    data: CreateFishingBanPeriodVersionType,
    previous?: PreviousVersionEnd,
  ) => {
    return await prisma.$transaction(async (tx) => {
      await endPreviousVersion(tx, previous);

      return await tx.fishing_ban_period.create({
        data: { ...versionData(data), fk_fishing_ban_id: fishingBanId },
        include: detailInclude,
      });
    });
  },

  // Defeso, ligacoes e versao mudam na mesma transacao. `previous` acompanha a correcao do
  // inicio de uma versao que substituiu outra.
  update: async (
    id: number,
    fishingBanId: number,
    data: UpdateFishingBanPeriodFields,
    fishingBan: FishingBanFields,
    previous?: PreviousVersionEnd,
  ) => {
    const { windows, species_ids, location_type_ids, municipalities, ...period } = data;
    const fishingBanData = stripUndefined(fishingBan);

    return await prisma.$transaction(async (tx) => {
      await replaceLinks(tx, id, data);
      await endPreviousVersion(tx, previous);

      if (Object.keys(fishingBanData).length > 0) {
        await tx.fishing_ban.update({ where: { id: fishingBanId }, data: fishingBanData });
      }

      return await tx.fishing_ban_period.update({
        where: { id },
        data: stripUndefined(period),
        include: detailInclude,
      });
    });
  },

  // Ativa um rascunho, encerra a versao anterior e, se ha outra depois dele, grava o fim.
  activate: async (id: number, validUntil: Date | null, previous?: PreviousVersionEnd) => {
    return await prisma.$transaction(async (tx) => {
      await endPreviousVersion(tx, previous);

      return await tx.fishing_ban_period.update({
        where: { id },
        data: { status: "ACTIVE", valid_until: validUntil },
        include: detailInclude,
      });
    });
  },
};
