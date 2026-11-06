// Colunas DATE chegam do Prisma como Date a meia-noite UTC. As duas funcoes
// leem a data em UTC (toISOString) para nao voltar um dia em fusos
// negativos, como o UTC-3.

// Data no formato AAAA-MM-DD.
export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Mes e dia no formato MM-DD, para janelas que se repetem todo ano (o ano
// gravado e so referencia).
export function toMonthDay(date: Date) {
  return date.toISOString().slice(5, 10);
}
