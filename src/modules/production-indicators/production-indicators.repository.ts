import { prisma, Prisma } from "@core/prisma.js";
import {
  ACCENTED_LETTERS,
  UNACCENTED_LETTERS,
} from "@shared/utils/accent-insensitive-search.js";
import type { DateRange } from "./production-indicators.period.js";

// O $queryRaw devolve NUMERIC como Decimal e COUNT como bigint. Os tipos ficam soltos assim
// para o mapper converter os dois com toString, sem depender da inferência do Prisma.
type SqlNumber = { toString(): string };

export type RecordCountsRow = {
  finished_count: bigint;
  unfinished_count: bigint;
  worked_days: bigint;
};

export type SpeciesCatchRow = {
  species_id: number;
  main_name: string;
  unit_measure: string;
  quantity: SqlNumber;
  sold_quantity: SqlNumber;
  // Só as capturas vendidas com preço: base do preço médio pesado pela quantidade.
  priced_quantity: SqlNumber;
  priced_value: SqlNumber;
  fishing_days: bigint;
};

// Somas de captura de um grupo (lugar ou método). Quilo e unidade não se somam.
type CaptureTotalsRow = {
  quantity_kg: SqlNumber;
  quantity_units: SqlNumber;
  fishing_days: bigint;
};

export type LocationCatchRow = CaptureTotalsRow & {
  type_location_id: number;
  type_location_name: string;
  // Grafia da pesca mais recente do grupo; null nas pescas gravadas antes do campo existir.
  location_name: string | null;
};

export type MethodCatchRow = CaptureTotalsRow & {
  fishing_method_id: number;
  name: string;
};

export type MonthEarningsRow = {
  month: number;
  total_earned: SqlNumber;
  sales_count: bigint;
};

export type BuyerTypeSalesRow = {
  buyer_type_id: number;
  name: string;
  sales_count: bigint;
};

// Pescas terminadas do usuário no período, pela data da pesca: a mesma regra da home e do REAP
// no app, para os números baterem entre as telas.
function finishedRecordsIn(userId: number, range: DateRange) {
  return Prisma.sql`
    fr.fk_user_id = ${userId}
    AND fr.status = 'FINALIZADO'
    AND fr.fishing_date >= ${range.from}::date
    AND fr.fishing_date < ${range.to}::date
  `;
}

const captureTotals = Prisma.sql`
  COALESCE(SUM(frs.quantity) FILTER (WHERE frs.unit_measure = 'KG'), 0) AS quantity_kg,
  COALESCE(SUM(frs.quantity) FILTER (WHERE frs.unit_measure = 'UNIDADE'), 0) AS quantity_units,
  COUNT(DISTINCT fr.fishing_date) AS fishing_days
`;

// O nome do lugar agrupa sem caixa e sem acento ("rio pardo" = "Rio Pardo"), como no REAP.
const normalizedLocationName = Prisma.sql`
  translate(lower(trim(COALESCE(fr.location_name, ''))), ${ACCENTED_LETTERS}, ${UNACCENTED_LETTERS})
`;

export const productionIndicatorsRepository = {
  /**
   * Pescas terminadas e sem terminar do período, e os dias distintos com pesca terminada.
   */
  countRecords: async (userId: number, range: DateRange) => {
    const [row] = await prisma.$queryRaw<RecordCountsRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE fr.status = 'FINALIZADO') AS finished_count,
        COUNT(*) FILTER (WHERE fr.status = 'EM_ANDAMENTO') AS unfinished_count,
        COUNT(DISTINCT fr.fishing_date) FILTER (WHERE fr.status = 'FINALIZADO') AS worked_days
      FROM pescare.fishing_record fr
      WHERE fr.fk_user_id = ${userId}
        AND fr.fishing_date >= ${range.from}::date
        AND fr.fishing_date < ${range.to}::date
    `;

    return row;
  },

  /**
   * Captura somada por espécie e unidade, com a parte vendida e a base do preço médio.
   */
  sumCatchesBySpecies: (userId: number, range: DateRange) =>
    prisma.$queryRaw<SpeciesCatchRow[]>`
      SELECT
        s.id AS species_id,
        s.main_name,
        frs.unit_measure,
        SUM(frs.quantity) AS quantity,
        COALESCE(SUM(frs.quantity) FILTER (WHERE frs.commercialized), 0) AS sold_quantity,
        COALESCE(SUM(frs.quantity) FILTER (
          WHERE frs.commercialized AND frs.unit_value IS NOT NULL
        ), 0) AS priced_quantity,
        COALESCE(SUM(frs.quantity * frs.unit_value) FILTER (
          WHERE frs.commercialized AND frs.unit_value IS NOT NULL
        ), 0) AS priced_value,
        COUNT(DISTINCT fr.fishing_date) AS fishing_days
      FROM pescare.fishing_record fr
      JOIN pescare.fishing_record_species frs ON frs.fk_fishing_record_id = fr.id
      JOIN pescare.species s ON s.id = frs.fk_species_id
      WHERE ${finishedRecordsIn(userId, range)}
      GROUP BY s.id, s.main_name, frs.unit_measure
      ORDER BY quantity DESC, s.main_name ASC
    `,

  /**
   * Captura somada por lugar: tipo de local + nome do lugar sem caixa e sem acento.
   */
  sumCatchesByLocation: (userId: number, range: DateRange) =>
    prisma.$queryRaw<LocationCatchRow[]>`
      SELECT
        tl.id AS type_location_id,
        tl.name AS type_location_name,
        (array_agg(NULLIF(trim(fr.location_name), '') ORDER BY fr.fishing_date DESC, fr.id DESC))[1]
          AS location_name,
        ${captureTotals}
      FROM pescare.fishing_record fr
      JOIN pescare.fishing_record_species frs ON frs.fk_fishing_record_id = fr.id
      JOIN pescare.type_location tl ON tl.id = fr.fk_type_location_id
      WHERE ${finishedRecordsIn(userId, range)}
      GROUP BY tl.id, tl.name, ${normalizedLocationName}
      ORDER BY quantity_kg DESC, quantity_units DESC
    `,

  /**
   * Captura somada por método de pesca.
   */
  sumCatchesByMethod: (userId: number, range: DateRange) =>
    prisma.$queryRaw<MethodCatchRow[]>`
      SELECT
        fm.id AS fishing_method_id,
        fm.name,
        ${captureTotals}
      FROM pescare.fishing_record fr
      JOIN pescare.fishing_record_species frs ON frs.fk_fishing_record_id = fr.id
      JOIN pescare.fishing_method fm ON fm.id = fr.fk_fishing_method_id
      WHERE ${finishedRecordsIn(userId, range)}
      GROUP BY fm.id, fm.name
      ORDER BY quantity_kg DESC, quantity_units DESC
    `,

  /**
   * Total vendido e número de vendas em cada mês do período, pela data da pesca.
   * O período nunca passa de um ano, então o número do mês basta.
   */
  sumEarningsByMonth: (userId: number, range: DateRange) =>
    prisma.$queryRaw<MonthEarningsRow[]>`
      SELECT
        EXTRACT(MONTH FROM fr.fishing_date)::int AS month,
        SUM(c.total_value) AS total_earned,
        COUNT(DISTINCT c.id) AS sales_count
      FROM pescare.fishing_record fr
      JOIN pescare.commercialization c ON c.fk_fishing_record_id = fr.id
      WHERE ${finishedRecordsIn(userId, range)}
      GROUP BY 1
      ORDER BY 1
    `,

  /**
   * Vendas por tipo de comprador. Conta vendas, não reais: uma venda pode ter vários tipos e o
   * valor total não se divide entre eles.
   */
  countSalesByBuyerType: (userId: number, range: DateRange) =>
    prisma.$queryRaw<BuyerTypeSalesRow[]>`
      SELECT
        bt.id AS buyer_type_id,
        bt.name,
        COUNT(DISTINCT c.id) AS sales_count
      FROM pescare.fishing_record fr
      JOIN pescare.commercialization c ON c.fk_fishing_record_id = fr.id
      JOIN pescare.commercialization_buyer cb ON cb.fk_commercialization_id = c.id
      JOIN pescare.buyer_type bt ON bt.id = cb.fk_buyer_type_id
      WHERE ${finishedRecordsIn(userId, range)}
      GROUP BY bt.id, bt.name
      ORDER BY sales_count DESC, bt.name ASC
    `,
};
