import type { IndicatorsPeriod } from "./production-indicators.schema.js";

// Intervalo de datas "AAAA-MM-DD" com o fim exclusivo. Vai como texto e vira DATE no SQL
// (`::date`), para o fuso do servidor não deslocar o dia.
export type DateRange = { from: string; to: string };

function isoDate(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * Intervalo de datas do período: do dia 1 do mês (ou de janeiro) até o dia 1 do seguinte.
 *
 * Exemplo: toDateRange({ year: 2026, month: 12 }) === { from: "2026-12-01", to: "2027-01-01" }
 */
export function toDateRange(period: IndicatorsPeriod): DateRange {
  if (period.month === undefined) {
    return { from: isoDate(period.year, 1), to: isoDate(period.year + 1, 1) };
  }

  const isDecember = period.month === 12;

  return {
    from: isoDate(period.year, period.month),
    to: isDecember ? isoDate(period.year + 1, 1) : isoDate(period.year, period.month + 1),
  };
}

/**
 * Período anterior, para comparar: o mês de antes (janeiro volta para dezembro do ano
 * anterior) ou o ano de antes.
 *
 * Exemplo: previousPeriod({ year: 2026, month: 1 }) === { year: 2025, month: 12 }
 */
export function previousPeriod(period: IndicatorsPeriod): IndicatorsPeriod {
  if (period.month === undefined) return { year: period.year - 1 };
  if (period.month === 1) return { year: period.year - 1, month: 12 };

  return { year: period.year, month: period.month - 1 };
}
