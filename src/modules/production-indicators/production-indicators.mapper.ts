import type { IndicatorsPeriod } from "./production-indicators.schema.js";
import type {
  BuyerTypeSalesRow,
  LocationCatchRow,
  MethodCatchRow,
  MonthEarningsRow,
  RecordCountsRow,
  SpeciesCatchRow,
} from "./production-indicators.repository.js";

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Tudo o que as consultas devolvem, já resolvido pelo service.
export type IndicatorsQueryResult = {
  period: IndicatorsPeriod;
  previous: IndicatorsPeriod;
  counts: RecordCountsRow | undefined;
  species: SpeciesCatchRow[];
  locations: LocationCatchRow[];
  methods: MethodCatchRow[];
  earnings: MonthEarningsRow[];
  previousEarnings: MonthEarningsRow[];
  buyerTypes: BuyerTypeSalesRow[];
};

/**
 * Decimal (NUMERIC) e bigint (COUNT) do $queryRaw viram número. Sem isso o res.json quebra no
 * bigint e manda o Decimal como texto.
 *
 * Exemplo: toNumber(10n) === 10
 */
function toNumber(value: { toString(): string } | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value.toString());
}

// Dinheiro e preço com duas casas, como o banco guarda.
function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toPeriodResponse(period: IndicatorsPeriod) {
  return { year: period.year, month: period.month ?? null };
}

function sumEarned(rows: MonthEarningsRow[]) {
  return rows.reduce((sum, row) => sum + toNumber(row.total_earned), 0);
}

// No ano, os 12 meses na ordem, com 0 no mês sem venda; no mês, null.
function toEarningsByMonth(period: IndicatorsPeriod, rows: MonthEarningsRow[]) {
  if (period.month !== undefined) return null;

  return ALL_MONTHS.map((month) => {
    const row = rows.find((item) => item.month === month);

    return { month, total_earned: roundMoney(toNumber(row?.total_earned)) };
  });
}

function toFinance(result: IndicatorsQueryResult) {
  const totalEarned = sumEarned(result.earnings);
  const workedDays = toNumber(result.counts?.worked_days);

  return {
    total_earned: roundMoney(totalEarned),
    earned_per_day: workedDays > 0 ? roundMoney(totalEarned / workedDays) : null,
    previous_period: {
      ...toPeriodResponse(result.previous),
      total_earned: roundMoney(sumEarned(result.previousEarnings)),
    },
    by_month: toEarningsByMonth(result.period, result.earnings),
  };
}

// Soma uma coluna das linhas de espécie numa unidade só: quilo e unidade não se somam.
function sumSpeciesColumn(
  rows: SpeciesCatchRow[],
  unit: string,
  column: "quantity" | "sold_quantity",
) {
  return rows
    .filter((row) => row.unit_measure === unit)
    .reduce((sum, row) => sum + toNumber(row[column]), 0);
}

// Preço médio do quilo ou da unidade, pesado pela quantidade: 10 kg a R$ 10 e 30 kg a R$ 14
// dão R$ 13. Só entram as espécies vendidas com preço.
function toAveragePrices(rows: SpeciesCatchRow[]) {
  return rows
    .filter((row) => toNumber(row.priced_quantity) > 0)
    .map((row) => ({
      species_id: row.species_id,
      main_name: row.main_name,
      unit_measure: row.unit_measure,
      average_price: roundMoney(toNumber(row.priced_value) / toNumber(row.priced_quantity)),
    }))
    .sort((a, b) => b.average_price - a.average_price);
}

function toSales(result: IndicatorsQueryResult) {
  return {
    sales_count: result.earnings.reduce((sum, row) => sum + toNumber(row.sales_count), 0),
    caught_kg: sumSpeciesColumn(result.species, "KG", "quantity"),
    sold_kg: sumSpeciesColumn(result.species, "KG", "sold_quantity"),
    caught_units: sumSpeciesColumn(result.species, "UNIDADE", "quantity"),
    sold_units: sumSpeciesColumn(result.species, "UNIDADE", "sold_quantity"),
    average_prices: toAveragePrices(result.species),
    by_buyer_type: result.buyerTypes.map((row) => ({
      buyer_type_id: row.buyer_type_id,
      name: row.name,
      sales_count: toNumber(row.sales_count),
    })),
  };
}

function toCaptureTotals(row: LocationCatchRow | MethodCatchRow) {
  return {
    quantity_kg: toNumber(row.quantity_kg),
    quantity_units: toNumber(row.quantity_units),
    fishing_days: toNumber(row.fishing_days),
  };
}

function toCatches(result: IndicatorsQueryResult) {
  return {
    catches_by_species: result.species.map((row) => ({
      species_id: row.species_id,
      main_name: row.main_name,
      unit_measure: row.unit_measure,
      quantity: toNumber(row.quantity),
      fishing_days: toNumber(row.fishing_days),
    })),
    catches_by_location: result.locations.map((row) => ({
      type_location_id: row.type_location_id,
      type_location_name: row.type_location_name,
      location_name: row.location_name,
      ...toCaptureTotals(row),
    })),
    catches_by_method: result.methods.map((row) => ({
      fishing_method_id: row.fishing_method_id,
      name: row.name,
      ...toCaptureTotals(row),
    })),
  };
}

/**
 * Monta a resposta de GET /production-indicators a partir das consultas do repositório.
 *
 * Exemplo: toProductionIndicatorsResponse(result).finance.total_earned // 900
 */
export function toProductionIndicatorsResponse(result: IndicatorsQueryResult) {
  return {
    period: toPeriodResponse(result.period),
    overview: {
      finished_count: toNumber(result.counts?.finished_count),
      unfinished_count: toNumber(result.counts?.unfinished_count),
      worked_days: toNumber(result.counts?.worked_days),
    },
    ...toCatches(result),
    finance: toFinance(result),
    sales: toSales(result),
  };
}
