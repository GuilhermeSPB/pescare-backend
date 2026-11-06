import { toIsoDate } from "@shared/utils/dates.js";

// Formato da pesca lido do banco, com as ligações que o app mostra. Escrito à mão para o
// mapeamento não depender da inferência do Prisma.
export type FishingRecordRow = {
  id: number;
  fishing_date: Date;
  status: string;
  fk_type_location_id: number;
  fk_fishing_method_id: number;
  fk_municipality_ibge_code: string;
  location_name: string | null;
  fishing_record_species: {
    id: number;
    fk_species_id: number;
    quantity: { toString(): string };
    unit_measure: string;
    unit_value: { toString(): string } | null;
    commercialized: boolean;
    species: { id: number; main_name: string };
  }[];
  commercialization: {
    id: number;
    commercialization_date: Date;
    total_value: { toString(): string };
    commercialization_buyer: {
      buyer_type: { id: number; name: string };
    }[];
  }[];
};

/**
 * Converte a pesca do banco no formato da API: datas em "AAAA-MM-DD" e valores decimais
 * como número (o Prisma devolve Decimal, que o JSON leva como texto).
 *
 * @example
 * toFishingRecordResponse(row).fishing_date // "2026-11-02"
 */
export function toFishingRecordResponse(record: FishingRecordRow) {
  const [sale] = record.commercialization;

  return {
    id: record.id,
    fishing_date: toIsoDate(record.fishing_date),
    status: record.status,
    fk_type_location_id: record.fk_type_location_id,
    fk_fishing_method_id: record.fk_fishing_method_id,
    fk_municipality_ibge_code: record.fk_municipality_ibge_code,
    // null só em pescas gravadas antes do campo existir.
    location_name: record.location_name,
    species: record.fishing_record_species.map((item) => ({
      id: item.id,
      fk_species_id: item.fk_species_id,
      main_name: item.species.main_name,
      quantity: Number(item.quantity.toString()),
      unit_measure: item.unit_measure,
      unit_value: item.unit_value === null ? null : Number(item.unit_value.toString()),
      commercialized: item.commercialized,
    })),
    // O app grava uma venda por pesca; a lista do banco é achatada para uma só.
    commercialization: sale
      ? {
          id: sale.id,
          commercialization_date: toIsoDate(sale.commercialization_date),
          total_value: Number(sale.total_value.toString()),
          buyer_types: sale.commercialization_buyer.map((item) => item.buyer_type),
        }
      : null,
  };
}
