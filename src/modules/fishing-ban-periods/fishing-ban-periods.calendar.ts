// Calendário do defeso. As janelas são anuais e valem só mês e dia: o ano gravado no banco é
// referência. Uma janela pode virar o ano (11-15 → 03-15), e aí o fim cai no ano seguinte.

export interface RecurringWindow {
  start_date: Date;
  end_date: Date;
}

// Vigência da norma: o período vale entre start_in e valid_until (null = sem fim).
export interface PeriodValidity {
  start_in: Date;
  valid_until: Date | null;
  windows: RecurringWindow[];
}

// "Vigente" tem o fim da janela atual; "proximo" tem o próximo início.
export type DateClassification =
  | { status: "EM_VIGOR"; starts_on: null; ends_on: Date }
  | { status: "PROXIMO"; starts_on: Date; ends_on: null };

/**
 * Mês e dia como número MMDD (15 de novembro → 1115), para comparar janelas sem o ano.
 *
 * @example
 * toMonthDayNumber(new Date("2026-11-15")) // 1115
 */
export function toMonthDayNumber(date: Date) {
  return (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

/**
 * A data cai na janela anual? Compara só mês e dia, e aceita janela que vira o ano.
 *
 * @example
 * isDateInRecurringWindow(new Date("2027-01-10"), new Date("2000-11-01"), new Date("2000-02-28")) // true
 */
export function isDateInRecurringWindow(date: Date, startDate: Date, endDate: Date) {
  const day = toMonthDayNumber(date);
  const start = toMonthDayNumber(startDate);
  const end = toMonthDayNumber(endDate);

  if (start <= end) {
    return start <= day && day <= end;
  }

  return day >= start || day <= end;
}

// Data de um dia do ano em UTC. Dia 29 em ano sem fevereiro bissexto vira 28.
function utcDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

// Uma ocorrência da janela que começa no ano informado. Se a janela vira o ano, termina no seguinte.
function occurrenceStartingIn(range: RecurringWindow, year: number) {
  const start = utcDay(year, range.start_date.getUTCMonth(), range.start_date.getUTCDate());
  const endsNextYear = toMonthDayNumber(range.end_date) < toMonthDayNumber(range.start_date);
  const end = utcDay(
    endsNextYear ? year + 1 : year,
    range.end_date.getUTCMonth(),
    range.end_date.getUTCDate(),
  );

  return { start, end };
}

/**
 * Fim da ocorrência da janela que contém a data, ou null se a data fica fora dela.
 *
 * @example
 * windowEndContaining(new Date("2027-01-10"), range) // 2027-02-28, para a janela 11-01 a 02-28
 */
export function windowEndContaining(date: Date, range: RecurringWindow): Date | null {
  const year = date.getUTCFullYear();

  for (const startYear of [year - 1, year]) {
    const { start, end } = occurrenceStartingIn(range, startYear);

    if (start <= date && date <= end) {
      return end;
    }
  }

  return null;
}

/**
 * Próximo início da janela, a partir da data (inclusive). Olha este ano e o seguinte.
 *
 * @example
 * nextWindowStart(new Date("2026-12-15"), range) // 2027-11-01, para a janela 11-01 a 02-28
 */
export function nextWindowStart(from: Date, range: RecurringWindow): Date | null {
  const year = from.getUTCFullYear();
  const starts = [year, year + 1].map((startYear) => occurrenceStartingIn(range, startYear).start);

  return starts.find((start) => start >= from) ?? null;
}

// Menor data entre as encontradas, ou null se não há nenhuma.
function earliest(dates: (Date | null)[]): Date | null {
  const found = dates.filter((date): date is Date => date !== null);

  return found.length === 0 ? null : new Date(Math.min(...found.map((date) => date.getTime())));
}

// Maior data entre as encontradas, ou null se não há nenhuma.
function latest(dates: (Date | null)[]): Date | null {
  const found = dates.filter((date): date is Date => date !== null);

  return found.length === 0 ? null : new Date(Math.max(...found.map((date) => date.getTime())));
}

/**
 * Fim da janela atual do defeso. Se duas janelas contêm a data, vale a que termina por último:
 * o defeso só acaba quando acaba a última delas.
 *
 * @example
 * currentWindowEnd(new Date("2027-01-10"), ranges) // 2027-02-28
 */
export function currentWindowEnd(date: Date, ranges: RecurringWindow[]): Date | null {
  return latest(ranges.map((range) => windowEndContaining(date, range)));
}

/**
 * Próximo início de qualquer janela do defeso, a partir da data (inclusive).
 *
 * @example
 * nextStartOnOrAfter(new Date("2026-10-01"), ranges) // 2026-11-01
 */
export function nextStartOnOrAfter(from: Date, ranges: RecurringWindow[]): Date | null {
  return earliest(ranges.map((range) => nextWindowStart(from, range)));
}

/**
 * Situação do período numa data. Vigente: a data cai numa janela dentro da vigência da norma.
 * Próximo: ainda não vale, mas uma janela começa dentro da vigência. Qualquer outro caso: null.
 *
 * @example
 * classifyOnDate(period, new Date("2026-11-03")) // { status: "EM_VIGOR", starts_on: null, ends_on: ... }
 */
export function classifyOnDate(period: PeriodValidity, date: Date): DateClassification | null {
  const { start_in: startIn, valid_until: validUntil, windows } = period;
  const isInValidity = startIn <= date && (validUntil === null || date <= validUntil);
  const windowEnd = isInValidity ? currentWindowEnd(date, windows) : null;

  if (windowEnd) {
    const endsOn = validUntil !== null && validUntil < windowEnd ? validUntil : windowEnd;

    return { status: "EM_VIGOR", starts_on: null, ends_on: endsOn };
  }

  const nextStart = nextStartOnOrAfter(startIn > date ? startIn : date, windows);

  if (nextStart && (validUntil === null || nextStart <= validUntil)) {
    return { status: "PROXIMO", starts_on: nextStart, ends_on: null };
  }

  return null;
}
