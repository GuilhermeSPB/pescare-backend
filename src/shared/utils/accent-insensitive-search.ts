// Mapa de `translate()` no SQL. O banco nao tem a extensao `unaccent`, e o
// `contains` do Prisma diferencia acentos: "sao" nao acharia "São".
export const ACCENTED_LETTERS = "áàâãäéèêëíìîïóòôõöúùûüçñ";
export const UNACCENTED_LETTERS = "aaaaaeeeeiiiiooooouuuucn";

/**
 * Monta o padrao de LIKE para uma busca sem acentos e sem caixa, escapando os
 * curingas digitados. Usar contra `translate(lower(coluna), ACCENTED_LETTERS,
 * UNACCENTED_LETTERS)`.
 *
 * Exemplo: buildAccentInsensitivePattern("São_") === "%sao\\_%"
 */
export function buildAccentInsensitivePattern(searchTerm: string) {
  const normalizedTerm = searchTerm
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return `%${normalizedTerm.replace(/[\\%_]/g, "\\$&")}%`;
}
